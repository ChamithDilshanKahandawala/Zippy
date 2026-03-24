import { useState, useEffect } from 'react';
import {
  collection, onSnapshot, query, orderBy, limit,
} from 'firebase/firestore';
import { geohashQueryBounds, distanceBetween } from 'geofire-common';
import { db } from '../config/firebase';

export interface NearbyDriver {
  uid: string;
  latitude: number;
  longitude: number;
  heading: number;
  speed: number;
  distanceKm: number;
  vehicleType: string;
}

/**
 * useNearbyDrivers
 * ────────────────
 * Fetches drivers within `radiusKm` of the given center using geohash-based
 * range queries on the `active_drivers` collection.
 *
 * Since Firestore doesn't support native geo-queries, we use geofire-common
 * to compute geohash bounds, run multiple range listeners, merge results,
 * then filter by actual haversine distance client-side.
 *
 * The hook creates multiple onSnapshot listeners (one per geohash bound)
 * and merges them into a deduplicated, distance-sorted list.
 */
export const useNearbyDrivers = (
  center: { latitude: number; longitude: number } | null,
  radiusKm: number = 5,
  vehicleFilter: string | null = null,
) => {
  const [drivers, setDrivers] = useState<NearbyDriver[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!center) {
      setDrivers([]);
      setLoading(false);
      return;
    }

    const radiusM = radiusKm * 1000;
    const bounds = geohashQueryBounds([center.latitude, center.longitude], radiusM);

    // Accumulator: maps uid → driver data from all bound queries
    const allResults = new Map<string, NearbyDriver>();
    let completedQueries = 0;

    const unsubscribes = bounds.map(([start, end]) => {
      const q = query(
        collection(db, 'active_riders'),
        // We use orderBy + startAt/endAt via the query constraints inside the map loop below 
        // because compound queries with range filters in firebase need careful typing, 
        // we'll just filter manually in memory for now because geohash bounds are small.
      );

      // For geohash range queries we use the raw onSnapshot and filter
      return onSnapshot(q, (snap) => {
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data();
          const g = data.location?.geohash as string | undefined;

          // Check if driver is available and matches filter
          if (data.status !== 'available') {
             allResults.delete(docSnap.id);
             return;
          }
          if (vehicleFilter && data.vehicleType !== vehicleFilter) {
             allResults.delete(docSnap.id);
             return;
          }

          // Check geohash is within our bounds
          if (g && g >= start && g <= end) {
            const lat = data.location?.lat ?? 0;
            const lng = data.location?.lng ?? 0;
            const distKm = distanceBetween(
              [lat, lng],
              [center.latitude, center.longitude],
            );

            // Final haversine filter — geohash bounds are approximate
            if (distKm <= radiusKm) {
              allResults.set(docSnap.id, {
                uid: docSnap.id,
                latitude: lat,
                longitude: lng,
                heading: data.heading ?? 0,
                speed: data.speed ?? 0,
                distanceKm: distKm,
                vehicleType: data.vehicleType ?? 'tuk',
              });
            } else {
              allResults.delete(docSnap.id);
            }
          }
        });

        // Merge into state
        const sorted = Array.from(allResults.values()).sort((a, b) => a.distanceKm - b.distanceKm);
        setDrivers(sorted);
        setLoading(false);
      });
    });

    return () => unsubscribes.forEach((unsub) => unsub());
  }, [center?.latitude, center?.longitude, radiusKm, vehicleFilter]);

  return { drivers, loading };
};
