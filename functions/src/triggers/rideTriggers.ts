import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { getDistance } from '../utils/geo';
import { sendPushNotification } from '../utils/notifications';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const db = admin.firestore();

// Constants for Fare Calculation (LKR)
const BASE_FARE = 100;
const COST_PER_KM = 50;

/**
 * Trigger: New Ride Request Created
 * Goal: Find nearby drivers and notify them.
 */
export const onRideCreated = functions.firestore
  .document('rides/{rideId}')
  .onCreate(async (snap, context) => {
    const rideId = context.params.rideId;
    const rideData = snap.data();
    
    if (!rideData) return;

    const { pickupLocation } = rideData;
    
    if (!pickupLocation || !pickupLocation.latitude || !pickupLocation.longitude) {
      functions.logger.error(`Ride ${rideId} has no valid pickup location.`);
      return;
    }

    const { latitude, longitude } = pickupLocation;
    const radiusInKm = 5;

    // 1. Find Drivers
    // Professional approach: Query active drivers.
    // Use a composite index for role + isOnline.
    const driversSnapshot = await db.collection('users')
      .where('role', '==', 'driver')
      .where('isOnline', '==', true)
      .get();

    const nearbyDriverIds: string[] = [];

    // Filter drivers within 5km
    driversSnapshot.forEach((doc: any) => {
      const driverData = doc.data();
      const driverLoc = driverData.currentLocation; // { latitude, longitude }

      if (driverLoc && driverLoc.latitude && driverLoc.longitude) {
        const dist = getDistance(
          latitude, 
          longitude, 
          driverLoc.latitude, 
          driverLoc.longitude
        );

        if (dist <= radiusInKm) {
          nearbyDriverIds.push(doc.id);
        }
      }
    });

    functions.logger.info(`Found ${nearbyDriverIds.length} drivers nearby for ride ${rideId}`);

    // 2. Update Ride Doc
    // Provide feedback to the doc so client knows search has started/drivers found
    await snap.ref.update({
      nearbyDriverIds: nearbyDriverIds,
      status: 'PENDING',
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    // 3. Notify Drivers
    // Limit notifications to avoid spam if too many drivers (e.g. top 10)
    const driversToNotify = nearbyDriverIds.slice(0, 10);
    
    const notificationPromises = driversToNotify.map(async (driverId) => {
      await sendPushNotification(
        driverId,
        'New Ride Request Nearby! 🚗',
        'Tap to view details and accept.',
        { rideId: rideId, type: 'RIDE_REQUEST' }
      );
    });

    await Promise.all(notificationPromises);
  });

/**
 * Trigger: Ride Status Updated
 * Goal: Handle Accepted (notify rider) and Completed (invoice).
 */
export const onRideUpdated = functions.firestore
  .document('rides/{rideId}')
  .onUpdate(async (change, context) => {
    const rideId = context.params.rideId;
    const newData = change.after.data();
    const oldData = change.before.data();

    if (!newData || !oldData) return;

    const newStatus = newData.status;
    const oldStatus = oldData.status;

    // Idempotency check: Avoid infinite loops if status didn't change
    if (newStatus === oldStatus) return;

    functions.logger.info(`Ride ${rideId} status changed: ${oldStatus} -> ${newStatus}`);

    // Case 1: Driver Accepted
    if (newStatus === 'ACCEPTED' && oldStatus === 'PENDING') {
      const riderId = newData.riderId;
      const driver = newData.driver; // Assuming driver object is stored
      const driverName = driver?.fullName || 'A driver';

      if (riderId) {
        await sendPushNotification(
          riderId,
          'Your Zippy is on the way! 🚕',
          `${driverName} has accepted your request.`,
          { rideId: rideId, status: 'ACCEPTED', type: 'RIDE_UPDATE' }
        );
      }
    }

    // Case 2: Ride Completed -> Generate Invoice & Deduct Payment
    if (newStatus === 'COMPLETED' && oldStatus !== 'COMPLETED') {
      const { pickupLocation, dropoffLocation, riderId, driver } = newData;

      if (!pickupLocation || !dropoffLocation || !riderId || !driver?.uid) {
        functions.logger.error('Missing critical data for invoice/payment.');
        return;
      }

      const driverId = driver.uid;

      // Calculate Distance (Haversine)
      const distanceKm = getDistance(
        pickupLocation.latitude,
        pickupLocation.longitude,
        dropoffLocation.latitude,
        dropoffLocation.longitude
      );

      // Simple Fare Calculation
      const amount = Math.ceil(BASE_FARE + (distanceKm * COST_PER_KM));
      const platformFee = Math.ceil(amount * 0.10); // 10% commission
      const driverEarnings = amount - platformFee;

      const invoice = {
        rideId,
        riderId,
        driverId,
        distanceKm: Number(distanceKm.toFixed(2)),
        amount,
        currency: 'LKR',
        completedAt: admin.firestore.FieldValue.serverTimestamp(),
        breakdown: {
          baseFare: BASE_FARE,
          distanceFare: Number((distanceKm * COST_PER_KM).toFixed(2)),
          platformFee,
          driverEarnings
        }
      };

      functions.logger.info(`Processing Payment for ${rideId}: ${amount} LKR`);

      try {
        await db.runTransaction(async (t) => {
          // 1. Get User Docs for Wallet Balance
          const riderRef = db.collection('users').doc(riderId);
          const driverRef = db.collection('users').doc(driverId);
          
          const riderDoc = await t.get(riderRef);
          const driverDoc = await t.get(driverRef);

          if (!riderDoc.exists || !driverDoc.exists) {
            throw new Error('User(s) not found for payment processing');
          }

          const riderBalance = riderDoc.data()?.walletBalance || 0;
          const driverBalance = driverDoc.data()?.walletBalance || 0;

          // 2. Update Balances
          t.update(riderRef, { walletBalance: riderBalance - amount });
          t.update(driverRef, { walletBalance: driverBalance + driverEarnings });

          // 3. Create Transaction Records
          const riderTxRef = db.collection('transactions').doc();
          t.set(riderTxRef, {
            userId: riderId,
            amount: -amount,
            type: 'ride_payment',
            status: 'success',
            rideId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Payment for ride ${rideId}`
          });

          const driverTxRef = db.collection('transactions').doc();
          t.set(driverTxRef, {
            userId: driverId,
            amount: driverEarnings,
            type: 'ride_earning',
            status: 'success',
            rideId,
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            description: `Earnings for ride ${rideId}`
          });

          // 4. Update Ride Doc to final verified state
          t.update(change.after.ref, {
            fare: amount,
            invoice,
            paymentStatus: 'PAID'
          });

          // 5. Save History
          const driverHistoryRef = db.collection('users').doc(driverId).collection('rideHistory').doc(rideId);
          t.set(driverHistoryRef, { ...invoice, role: 'driver', status: 'COMPLETED' }, { merge: true });

          const riderHistoryRef = db.collection('users').doc(riderId).collection('rideHistory').doc(rideId);
          t.set(riderHistoryRef, { ...invoice, role: 'rider', status: 'COMPLETED' }, { merge: true });
        });

        functions.logger.info(`Payment Success for Ride ${rideId}`);

        // Notify Rider
        await sendPushNotification(
            riderId,
            'Ride Completed! 🎉',
            `Your ride cost ${amount} LKR. Wallet updated.`,
            { rideId, type: 'INVOICE' }
        );

      } catch (error) {
        functions.logger.error('Transaction failure:', error);
      }
    }
  });
