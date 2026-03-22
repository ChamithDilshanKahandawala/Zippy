import { Request, Response, RequestHandler } from 'express';
import { db } from '../config/firebase';
import { matchRide } from '../services/matchingEngine';

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
