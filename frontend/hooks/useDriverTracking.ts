import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';

interface DriverLocation {
  latitude: number;
  longitude: number;
  heading?: number;
}

export const useDriverTracking = (driverId: string | null, riderLocation: { latitude: number; longitude: number } | null) => {
  const [driverLocation, setDriverLocation] = useState<DriverLocation | null>(null);
  const [isDriverArrived, setIsDriverArrived] = useState(false);

  useEffect(() => {
    if (!driverId) {
      setDriverLocation(null);
      setIsDriverArrived(false);
      return;
    }

    const driverRef = doc(db, 'users', driverId);

    const unsubscribe = onSnapshot(driverRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data.currentLocation) {
          const newLoc: DriverLocation = {
            latitude: data.currentLocation.latitude,
            longitude: data.currentLocation.longitude,
            heading: data.currentLocation.heading || 0,
          };
          setDriverLocation(newLoc);

          // Check distance
          if (riderLocation) {
            const distance = getDistanceFromLatLonInKm(
              riderLocation.latitude,
              riderLocation.longitude,
              newLoc.latitude,
              newLoc.longitude
            );
            // 0.05 km = 50 meters
            if (distance < 0.05) {
              setIsDriverArrived(true);
            }
          }
        }
      }
    }, (error) => {
      console.error("Error fetching driver location:", error);
    });

    return () => unsubscribe();
  }, [driverId, riderLocation]);

  return { driverLocation, isDriverArrived };
};

// Helper for Haversine distance
function getDistanceFromLatLonInKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}
