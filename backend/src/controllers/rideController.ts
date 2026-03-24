import { Request, Response, RequestHandler } from 'express';
import { db } from '../config/firebase';
import { FieldValue } from 'firebase-admin/firestore';
import { matchRide } from '../services/matchingEngine';
import { sendPushNotification } from '../services/notificationService';

/**
 * Trigger the ride matching engine.
 * Call this when a passenger creates a new ride (or trigger via Firestore function).
 */
export const requestDispatch: RequestHandler = async (req, res, next) => {
  try {
    const { rideId } = req.body;
    if (!rideId) {
      res.status(400).json({ success: false, error: 'rideId is required' });
      return;
    }

    // Fire and forget the matching engine (it runs asynchronously)
    matchRide(rideId).catch((err) => console.error('Matching engine error:', err));

    res.json({ success: true, message: 'Dispatch started' });
  } catch (error) {
    next(error);
  }
};

/**
 * Driver accepts the ride offer.
 */
export const acceptRide: RequestHandler = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { driverId } = req.body; // In production, get this from req.user authenticated token

    if (!driverId) {
      res.status(400).json({ success: false, error: 'driverId is required' });
      return;
    }

    const rideRef = db.collection('rides').doc(rideId);
    
    // We use a Firestore transaction to prevent race conditions
    // (e.g., if the timeout expired the exact millisecond the driver clicked accept)
    await db.runTransaction(async (transaction) => {
      const rideDoc = await transaction.get(rideRef);
      if (!rideDoc.exists) {
        throw new Error('Ride not found');
      }

      const rideData = rideDoc.data();
      
      // Ride must be in SEARCHING state and offered to this specific driver
      if (rideData?.status !== 'SEARCHING') {
        throw new Error(`Ride is no longer available (status: ${rideData?.status})`);
      }
      
      if (rideData?.offeredToDriverId !== driverId) {
        throw new Error('This ride was not offered to you');
      }

      // Fetch driver details to embed in the ride doc
      const driverDoc = await transaction.get(db.collection('users').doc(driverId));
      const driverData = driverDoc.data();

      // Update the ride status
      transaction.update(rideRef, {
        status: 'ACCEPTED',
        driverId,
        driver: {
          uid: driverId,
          fullName: driverData?.fullName ?? 'Driver',
          phoneNumber: driverData?.phoneNumber ?? '',
          rating: driverData?.rating ?? 5.0,
          vehicleModel: driverData?.riderDetails?.vehicleModel ?? '',
          vehiclePlate: driverData?.riderDetails?.vehiclePlate ?? '',
        },
        acceptedAt: new Date(),
      });
    });

    res.json({ success: true, message: 'Ride accepted successfully' });
  } catch (error: any) {
    console.error('acceptRide error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Driver declines the ride offer.
 */
export const declineRide: RequestHandler = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { driverId } = req.body;

    const rideRef = db.collection('rides').doc(rideId);
    const rideDoc = await rideRef.get();

    if (!rideDoc.exists) {
      res.status(404).json({ success: false, error: 'Ride not found' });
      return;
    }

    const rideData = rideDoc.data();
    if (rideData?.offeredToDriverId === driverId && rideData?.status === 'SEARCHING') {
      // Clear the offeredToDriverId so the matching engine knows it can move on immediately
      // The matching engine interval loop will see this and try the next driver.
      await rideRef.update({ declinedBy: db.collection('rides').doc().id }); // Force a small update so snapshot triggers if needed
    }

    res.json({ success: true, message: 'Ride declined' });
  } catch (error) {
    next(error);
  }
};

/**
 * Update the status of a ride (e.g. ARRIVED, IN_PROGRESS).
 */
export const updateRideStatus: RequestHandler = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { status, driverId } = req.body;

    const rideRef = db.collection('rides').doc(rideId);
    const rideDoc = await rideRef.get();

    if (!rideDoc.exists) {
      res.status(404).json({ success: false, error: 'Ride not found' });
      return;
    }

    const rideData = rideDoc.data();
    if (rideData?.driverId !== driverId) {
      res.status(403).json({ success: false, error: 'Unauthorized to update this ride' });
      return;
    }

    const updates: any = { status };
    if (status === 'IN_PROGRESS') updates.startedAt = new Date();

    await rideRef.update(updates);

    // Notifications
    if (status === 'ARRIVED') {
      await sendPushNotification(
        rideData?.riderId,
        'Driver Arrived 📍',
        'Your driver is outside waiting for you.',
        { type: 'RIDE_ARRIVED', rideId }
      );
    } else if (status === 'IN_PROGRESS') {
      await sendPushNotification(
        rideData?.riderId,
        'Trip Started 🚗',
        'Have a safe ride!',
        { type: 'RIDE_STARTED', rideId }
      );
    }

    res.json({ success: true, message: 'Ride status updated' });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete the ride, deduct wallet balance from passenger, and add earnings to driver.
 */
export const completeRide: RequestHandler = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { driverId, finalFare } = req.body;

    const rideRef = db.collection('rides').doc(rideId);

    await db.runTransaction(async (transaction) => {
      const rideDoc = await transaction.get(rideRef);
      if (!rideDoc.exists) throw new Error('Ride not found');

      const rideData = rideDoc.data();
      if (rideData?.driverId !== driverId) throw new Error('Unauthorized');
      if (rideData?.status === 'COMPLETED') throw new Error('Ride already completed');

      const passengerId = rideData?.riderId;
      const passengerRef = db.collection('users').doc(passengerId);
      const passengerDoc = await transaction.get(passengerRef);
      const passengerData = passengerDoc.data();

      let paymentStatus = 'PAID';
      const currentBalance = passengerData?.walletBalance ?? 0;
      const fare = finalFare ?? rideData?.estimatedFare ?? 0;

      // 📝 New: Audit Trail Reference
      const transactionRef = db.collection('transactions').doc();

      // Handle wallet deduction
      if (currentBalance >= fare) {
        transaction.update(passengerRef, {
          walletBalance: FieldValue.increment(-fare)
        });
        
        // Add to driver's earnings/wallet
        const driverRef = db.collection('users').doc(driverId);
        transaction.update(driverRef, {
          walletBalance: FieldValue.increment(fare),
          'riderDetails.totalEarnings': FieldValue.increment(fare)
        });

        // 📝 Log Successful Transaction
        transaction.set(transactionRef, {
          rideId,
          type: 'RIDE_PAYMENT',
          amount: fare,
          passengerId,
          driverId,
          status: 'SUCCESS',
          createdAt: FieldValue.serverTimestamp()
        });
      } else {
        paymentStatus = 'PENDING'; // Not enough balance, must pay cash or top-up
        
        // 📝 Log Failed/Pending Transaction
        transaction.set(transactionRef, {
          rideId,
          type: 'RIDE_PAYMENT',
          amount: fare,
          passengerId,
          driverId,
          status: 'INSUFFICIENT_BALANCE',
          createdAt: FieldValue.serverTimestamp()
        });
      }

      transaction.update(rideRef, {
        status: 'COMPLETED',
        completedAt: FieldValue.serverTimestamp(),
        fare: fare,
        paymentStatus
      });

      // Send notifications (handled outside transaction to avoid blocking if FCM is slow, but for simplicity we'll trigger here or just send right after)
    });

    // We fetch again to get safe data for push notification
    const finalRideDoc = await rideRef.get();
    const finalData = finalRideDoc.data();

    if (finalData?.paymentStatus === 'PAID') {
      await sendPushNotification(
        finalData?.riderId,
        'Ride Completed ✅',
        `Your ride has ended. LKR ${finalData.fare} was deducted from your wallet.`,
        { type: 'RIDE_COMPLETED', rideId }
      );
    } else {
      await sendPushNotification(
        finalData?.riderId,
        'Payment Pending ⚠️',
        `Your trip ended but your wallet balance was insufficient. Please pay LKR ${finalData?.fare} by cash.`,
        { type: 'PAYMENT_PENDING', rideId }
      );
    }

    res.json({ success: true, message: 'Ride completed successfully' });
  } catch (error: any) {
    console.error('completeRide error:', error.message);
    res.status(400).json({ success: false, error: error.message });
  }
};

/**
 * Provide a rating for the trip.
 */
export const rateRide: RequestHandler = async (req, res, next) => {
  try {
    const { rideId } = req.params;
    const { raterId, targetId, rating, isPassengerRatingDriver } = req.body;

    if (rating < 1 || rating > 5) {
      res.status(400).json({ success: false, error: 'Rating must be between 1 and 5' });
      return;
    }

    const rideRef = db.collection('rides').doc(rideId);
    const targetUserRef = db.collection('users').doc(targetId);

    await db.runTransaction(async (transaction) => {
      const rideDoc = await transaction.get(rideRef);
      if (!rideDoc.exists) throw new Error('Ride not found');

      // Update the specific rating field
      if (isPassengerRatingDriver) {
        transaction.update(rideRef, { ratingByPassenger: rating });
      } else {
        transaction.update(rideRef, { ratingByRider: rating });
      }

      // We should ideally calculate moving average, but for simplicity:
      // totalReviews + 1 and recalculate
      const targetDoc = await transaction.get(targetUserRef);
      const targetData = targetDoc.data();
      
      const currentTotalRef = targetData?.totalReviews ?? 0;
      const currentRating = targetData?.rating ?? 5.0;

      const newTotal = currentTotalRef + 1;
      const newAvg = ((currentRating * currentTotalRef) + rating) / newTotal;

      transaction.update(targetUserRef, {
        rating: newAvg,
        totalReviews: newTotal
      });
    });

    res.json({ success: true, message: 'Rating submitted' });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
};
