import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '../config/firebase'; // Ensure your firebase config path is correct
import { Ride, RideStatus } from '../types/ride';

interface UseRideStatusReturn {
  ride: Ride | null;
  status: RideStatus | null;
  loading: boolean;
  error: any | null;
}

export const useRideStatus = (rideId: string | null): UseRideStatusReturn => {
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<any | null>(null);
  const unsubscribeRef = useRef<Unsubscribe | null>(null);

  useEffect(() => {
    // If no ride ID, reset and exit early
    if (!rideId) {
      setRide(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    const rideDocRef = doc(db, 'rides', rideId);

    // Set up real-time listener
    unsubscribeRef.current = onSnapshot(
      rideDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const rideData = docSnap.data() as Ride;
          setRide(rideData);
          setLoading(false);

          // Example: If completed, maybe we want to keep listening to show the 'Rate Driver' modal
          // until the user dismisses it. So we don't auto-unsubscribe on COMPLETED here.
          // The parent component can decide when to stop listening by setting rideId to null.
        } else {
          // Document might have been deleted or doesn't exist
          setRide(null);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Error listening to ride status:', err);
        setError(err);
        setLoading(false);
      }
    );

    // Cleanup function: Unsubscribe when component unmounts or rideId changes
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [rideId]);

  return { 
    ride, 
    status: ride?.status || null, 
    loading, 
    error 
  };
};
