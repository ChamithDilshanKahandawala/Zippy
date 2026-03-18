import * as TaskManager from 'expo-task-manager';
import * as Location from 'expo-location';
import { socketService } from './socket';

export const LOCATION_TASK_NAME = 'background-location-task';

// Store tripId in a simple memory-based state for the task
// In a real app, you might use AsyncStorage or a more robust state management
let activeTripId: string | null = null;

export const setActiveTripId = (id: string | null) => {
  activeTripId = id;
};

TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
  if (error) {
    console.error('❌ Background location task error:', error);
    return;
  }
  if (data) {
    const { locations } = data as { locations: Location.LocationObject[] };
    if (locations && locations.length > 0) {
      const location = locations[0];
      const { latitude, longitude, heading } = location.coords;

      console.log(`📍 Background Location: ${latitude}, ${longitude}`);

      if (activeTripId) {
        socketService.emit('update_location', {
          tripId: activeTripId,
          coords: { latitude, longitude, heading },
        });
      }
    }
  }
});

export const startLocationTracking = async (tripId: string) => {
  setActiveTripId(tripId);
  
  const { status: foregroundStatus } = await Location.requestForegroundPermissionsAsync();
  if (foregroundStatus !== 'granted') {
    console.error('❌ Foreground location permission not granted');
    return;
  }

  const { status: backgroundStatus } = await Location.requestBackgroundPermissionsAsync();
  if (backgroundStatus !== 'granted') {
    console.error('❌ Background location permission not granted');
    return;
  }

  await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
    accuracy: Location.Accuracy.High,
    distanceInterval: 5, // Update every 5 meters
    deferredUpdatesInterval: 2000, // Update every 2 seconds
    // Android specific options for foreground service (sticky notification)
    foregroundService: {
      notificationTitle: 'Zippy is tracking your location',
      notificationBody: 'Keeping your trip updated in real-time.',
      notificationColor: '#7C3AED',
    },
  });
  
  console.log('🚀 Background location tracking started');
};

export const stopLocationTracking = async () => {
  setActiveTripId(null);
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.log('🛑 Background location tracking stopped');
  }
};
