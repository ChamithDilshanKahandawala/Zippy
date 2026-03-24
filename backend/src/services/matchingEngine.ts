import { db } from '../config/firebase';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { sendPushNotification } from './notificationService';

const SEARCH_RADIUS_M = 10_000; // 10km
const DRIVER_TIMEOUT_MS = 30_000; // 30 seconds per driver
const MAX_DRIVERS_TO_TRY = 10;

interface NearbyDriver {
  uid: string;
  distanceKm: number;
  pushToken?: string;
}

/**
 * Find nearby online drivers sorted by distance.
 * Uses geohash range queries on the active_riders collection.
 */
async function findNearbyDrivers(
  lat: number,
  lng: number,
  radiusM: number = SEARCH_RADIUS_M,
  excludeUids: string[] = [],
): Promise<NearbyDriver[]> {
  const bounds = geohashQueryBounds([lat, lng], radiusM);
  const results: NearbyDriver[] = [];

  for (const [start, end] of bounds) {
    // Only query drivers who are 'available'
    const snap = await db
      .collection('active_riders')
      .where('status', '==', 'available')
      .orderBy('location.geohash')
      .startAt(start)
      .endAt(end)
      .get();

    for (const doc of snap.docs) {
      if (excludeUids.includes(doc.id)) continue;

      const data = doc.data();
      const dLat = data.location?.lat ?? 0;
      const dLng = data.location?.lng ?? 0;
      const distKm = distanceBetween([dLat, dLng], [lat, lng]);

      if (distKm <= radiusM / 1000) {
        // Fetch pushToken from user profile
        const userDoc = await db.collection('users').doc(doc.id).get();
        const userData = userDoc.data();

        // Check if driver is already on a ride (double-booking prevention)
        const activeRides = await db
          .collection('rides')
          .where('driverId', '==', doc.id)
          .where('status', 'in', ['ACCEPTED', 'ARRIVED', 'IN_PROGRESS'])
          .limit(1)
          .get();

        if (!activeRides.empty) continue; // Skip busy drivers

        results.push({
          uid: doc.id,
          distanceKm: distKm,
          pushToken: userData?.pushToken,
        });
      }
    }
  }

  // Sort by distance (closest first)
  results.sort((a, b) => a.distanceKm - b.distanceKm);
  return results.slice(0, MAX_DRIVERS_TO_TRY);
}

/**
 * Dispatch ride to a single driver.
 * Sets `offeredTo` field on the ride doc and sends push notification.
 * Returns true if the driver accepted within the timeout.
 */
async function offerRideToDriver(
  rideId: string,
  driver: NearbyDriver,
  rideData: any,
): Promise<boolean> {
  const rideRef = db.collection('rides').doc(rideId);

  // Mark ride as offered to this driver
  await rideRef.update({
    offeredToDriverId: driver.uid,
    offeredAt: new Date(),
  });

  // Send push notification to driver
  if (driver.pushToken) {
    try {
      await sendPushNotification(
        driver.uid,
        '🚗 New Ride Request!',
        `Pickup: ${rideData.origin?.address ?? 'Nearby'} → ${rideData.destination?.address ?? 'Destination'}`,
        {
          type: 'RIDE_REQUEST',
          rideId,
          pickupLat: String(rideData.origin?.latitude ?? 0),
          pickupLng: String(rideData.origin?.longitude ?? 0),
          destAddress: rideData.destination?.address ?? '',
          estimatedFare: String(rideData.estimatedFare ?? 0),
        },
      );
    } catch (e) {
      console.error(`Failed to send push to driver ${driver.uid}:`, e);
    }
  }

  // Also notify via Socket.IO for real-time in-app popup
  const io = (global as any).__zippy_io;
  if (io) {
    io.to(`driver_${driver.uid}`).emit('ride_request', {
      rideId,
      origin: rideData.origin,
      destination: rideData.destination,
      estimatedFare: rideData.estimatedFare,
      rideType: rideData.rideType,
      timeoutMs: DRIVER_TIMEOUT_MS,
    });
  }

  // Wait for driver response (poll Firestore)
  return new Promise((resolve) => {
    const startTime = Date.now();
    const interval = setInterval(async () => {
      const elapsed = Date.now() - startTime;

      const rideSnap = await rideRef.get();
      const currentData = rideSnap.data();

      if (currentData?.status === 'ACCEPTED' && currentData?.driverId === driver.uid) {
        clearInterval(interval);
        resolve(true);
        return;
      }

      if (currentData?.status === 'CANCELLED') {
        clearInterval(interval);
        resolve(false);
        return;
      }

      if (elapsed >= DRIVER_TIMEOUT_MS) {
        clearInterval(interval);

        // Notify driver that the offer expired
        if (io) {
          io.to(`driver_${driver.uid}`).emit('ride_request_expired', { rideId });
        }

        resolve(false);
      }
    }, 2000); // Check every 2 seconds
  });
}

/**
 * Main Matching Engine
 * ────────────────────
 * Called when a new ride is created (status: PENDING).
 * Sequentially offers the ride to nearby drivers until one accepts.
 */
export async function matchRide(rideId: string): Promise<void> {
  const rideRef = db.collection('rides').doc(rideId);
  const rideSnap = await rideRef.get();

  if (!rideSnap.exists) {
    console.error(`[matchRide] Ride ${rideId} not found`);
    return;
  }

  const rideData = rideSnap.data()!;

  if (rideData.status !== 'PENDING') {
    console.log(`[matchRide] Ride ${rideId} is not PENDING, skipping`);
    return;
  }

  const pickupLat = rideData.origin?.latitude;
  const pickupLng = rideData.origin?.longitude;

  if (!pickupLat || !pickupLng) {
    console.error(`[matchRide] Ride ${rideId} has no origin coordinates`);
    await rideRef.update({ status: 'CANCELLED', cancelReason: 'Invalid pickup location' });
    return;
  }

  // Transition: PENDING → SEARCHING
  await rideRef.update({ status: 'SEARCHING' });

  console.log(`🔎 [matchRide] Searching nearby drivers for ride ${rideId}...`);

  const declinedDrivers: string[] = [];
  let matched = false;

  // Try up to MAX_DRIVERS_TO_TRY times to find a driver
  for (let attempt = 0; attempt < MAX_DRIVERS_TO_TRY; attempt++) {
    // Re-check ride status (passenger might have cancelled)
    const currentSnap = await rideRef.get();
    if (currentSnap.data()?.status === 'CANCELLED') {
      console.log(`[matchRide] Ride ${rideId} was cancelled by passenger`);
      return;
    }

    const nearbyDrivers = await findNearbyDrivers(pickupLat, pickupLng, SEARCH_RADIUS_M, declinedDrivers);

    if (nearbyDrivers.length === 0) {
      console.log(`[matchRide] No more nearby drivers for ride ${rideId}`);
      break;
    }

    // Offer to the closest available driver
    const driver = nearbyDrivers[0];
    console.log(`  → Offering ride ${rideId} to driver ${driver.uid} (${driver.distanceKm.toFixed(1)}km away)`);

    const accepted = await offerRideToDriver(rideId, driver, rideData);

    if (accepted) {
      console.log(`✅ [matchRide] Driver ${driver.uid} accepted ride ${rideId}`);
      matched = true;
      break;
    }

    // Driver declined or timed out — try next
    declinedDrivers.push(driver.uid);
    console.log(`  ✗ Driver ${driver.uid} did not accept. Trying next...`);
  }

  if (!matched) {
    // No driver found — mark ride as cancelled
    const finalSnap = await rideRef.get();
    if (finalSnap.data()?.status === 'SEARCHING') {
      await rideRef.update({
        status: 'CANCELLED',
        cancelReason: 'No drivers available',
      });
      console.log(`❌ [matchRide] No driver found for ride ${rideId}. Cancelled.`);

      // Notify passenger
      await sendPushNotification(
        rideData.riderId,
        'No Drivers Available 😞',
        'We couldn\'t find a driver near you. Please try again in a few minutes.',
        { type: 'NO_DRIVER', rideId },
      );
    }
  }
}
