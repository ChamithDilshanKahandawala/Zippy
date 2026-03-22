import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { doc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { geohashForLocation } from 'geofire-common';
import { db } from '../config/firebase';
import { socketService } from './socket';

export const LOCATION_TASK_NAME = 'background-location-task';

// In-memory state accessible from the background task
let activeDriverUid: string | null = null;
let activeTripId: string | null = null;
let foregroundWatcher: Location.LocationSubscription | null = null;

export const setActiveTripId = (id: string | null) => { activeTripId = id; };
export const setActiveDriverUid = (uid: string | null) => { activeDriverUid = uid; };

// ── Shared location handler (used by both background task and foreground watcher) ──
async function handleNewLocation(latitude: number, longitude: number, heading: number, speed: number) {
  // 1. Write to active_drivers (geohashed)
  if (activeDriverUid) {
    try {
      const hash = geohashForLocation([latitude, longitude]);
      await setDoc(doc(db, 'active_drivers', activeDriverUid), {
        uid: activeDriverUid,
        l: { lat: latitude, lng: longitude },
        g: hash,
        heading: heading ?? 0,
        speed: speed ?? 0,
        lastUpdated: serverTimestamp(),
      });
    } catch (e) {
      console.error('❌ Firestore active_drivers write error:', e);
    }
  }

  // 2. Update user profile for individual driver tracking
  if (activeDriverUid) {
    try {
      await setDoc(
        doc(db, 'users', activeDriverUid),
        { currentLocation: { latitude, longitude, heading: heading ?? 0, speed: speed ?? 0 } },
        { merge: true },
      );
    } catch (e) {
      console.error('❌ Firestore user location write error:', e);
    }
  }

  // 3. Socket.IO for active ride updates
  if (activeTripId) {
    socketService.emit('update_location', {
      tripId: activeTripId,
      coords: { latitude, longitude, heading },
    });
  }
}

// ── Background task definition ──────────────────────────────────────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }
  if (!data) return;

  const { locations } = data as { locations: Location.LocationObject[] };
  if (!locations?.length) return;

  const loc = locations[0];
  const { latitude, longitude, heading, speed } = loc.coords;
  await handleNewLocation(latitude, longitude, heading ?? 0, speed ?? 0);
});

// ── Foreground watcher fallback (for simulators / when bg perm is denied) ───
async function startForegroundWatcher() {
  if (foregroundWatcher) return; // already running

  foregroundWatcher = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: 5000,     // every 5 seconds
      distanceInterval: 10,   // or every 10 meters
    },
    async (loc) => {
      const { latitude, longitude, heading, speed } = loc.coords;
      await handleNewLocation(latitude, longitude, heading ?? 0, speed ?? 0);
    },
  );
  console.log('📍 Foreground location watcher started (simulator fallback)');
}

function stopForegroundWatcher() {
  if (foregroundWatcher) {
    foregroundWatcher.remove();
    foregroundWatcher = null;
    console.log('📍 Foreground location watcher stopped');
  }
}

/**
 * Start location tracking
 * ───────────────────────
 * Tries background first (physical device). If bg permissions denied
 * (simulator), falls back to foreground-only watcher.
 */
export const startLocationTracking = async (driverUid: string) => {
  setActiveDriverUid(driverUid);

  // Always need foreground permission
  const { status: fgStatus } = await Location.requestForegroundPermissionsAsync();
  if (fgStatus !== 'granted') {
    console.error('❌ Foreground location permission not granted');
    return;
  }

  // Write initial location immediately so driver appears on map right away
  try {
    const currentPos = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    const { latitude, longitude, heading, speed } = currentPos.coords;
    await handleNewLocation(latitude, longitude, heading ?? 0, speed ?? 0);
    console.log('📍 Initial location written:', latitude.toFixed(4), longitude.toFixed(4));
  } catch (e) {
    console.log('⚠️ Could not get initial position:', e);
  }

  // Try background permissions
  const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
  if (bgStatus === 'granted') {
    // Physical device — use background task
    await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
      accuracy: Location.Accuracy.BestForNavigation,
      distanceInterval: 10,
      deferredUpdatesInterval: 5000,
      foregroundService: {
        notificationTitle: 'Zippy — You are Online',
        notificationBody: 'Sharing your location with nearby passengers.',
        notificationColor: '#7C3AED',
      },
    });
    console.log('🚀 Background location tracking started for', driverUid);
  } else {
    // Simulator / bg denied — fall back to foreground watcher
    console.log('⚠️ Background location denied — using foreground fallback');
    await startForegroundWatcher();
  }
};

/**
 * Stop location tracking
 * ──────────────────────
 * Cleans up both background task and foreground watcher,
 * then removes the active_drivers document so driver disappears instantly.
 */
export const stopLocationTracking = async () => {
  const uid = activeDriverUid;

  // Stop foreground watcher if active
  stopForegroundWatcher();

  // Stop background task if active
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log('🛑 Background location tracking stopped');
  }

  // Remove driver from active_drivers collection
  if (uid) {
    try {
      await deleteDoc(doc(db, 'active_drivers', uid));
      console.log('🗑️ Removed from active_drivers');
    } catch (e) {
      console.error('❌ Failed to remove active_drivers doc:', e);
    }
  }

  setActiveDriverUid(null);
  setActiveTripId(null);
};
