import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  serverTimestamp, 
  query, 
  where, 
  getDocs, 
  limit,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../config/firebase'; 
import { RideStatus } from '../types/ride';

// ── Create a new Ride request ──────────────────────────────────────────────
export const createRide = async (
  riderId: string,
  origin: { latitude: number; longitude: number; address: string },
  destination: { latitude: number; longitude: number; address: string },
  estimatedFare: number,
  rideType: string
): Promise<string> => {
  // Fix 1: Ensure riderId exists to prevent Firebase permission crashes
  if (!riderId) {
    throw new Error("Cannot create ride: Rider is not authenticated.");
  }

  try {
    const ridesRef = collection(db, 'rides');
    
    const ridePayload = {
      riderId,
      status: 'PENDING' as RideStatus,
      origin,
      destination,
      rideType,
      estimatedFare,
      createdAt: serverTimestamp(),
      searchRadius: 5000, 
    };

    const docRef = await addDoc(ridesRef, ridePayload);
    return docRef.id;
  } catch (error: any) {
    console.error('Error creating ride request:', error.message);
    throw error;
  }
};

// ── Cancel an existing Ride request ──────────────────────────────────────────
export const cancelRide = async (rideId: string) => {
  if (!rideId) return;
  try {
    const rideRef = doc(db, 'rides', rideId);
    await updateDoc(rideRef, {
      status: 'CANCELLED' as RideStatus,
      cancelledAt: serverTimestamp(),
    });
  } catch (error: any) {
    console.error('Error cancelling ride:', error.message);
    throw error;
  }
};

// ── Check for any active ride to recover state ──────────────────────────────
export const checkForActiveRide = async (riderId: string): Promise<string | null> => {
  // Fix 2: If riderId is empty, return null immediately. 
  // Querying with an empty string often triggers "Insufficient Permissions".
  if (!riderId) return null;

  try {
    const ridesRef = collection(db, 'rides');
    
    // Fix 3: Added a limit for performance
    const q = query(
      ridesRef,
      where('riderId', '==', riderId),
      limit(10) 
    );

    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) return null;

    // Fix 4: Robust filtering for active statuses
    const activeRide = querySnapshot.docs.find(doc => {
      const data = doc.data();
      // Use uppercase to match your 'PENDING' payload above
      const activeStatuses: RideStatus[] = ['PENDING', 'ACCEPTED', 'STARTED'];
      return activeStatuses.includes(data.status);
    });

    return activeRide ? activeRide.id : null;
  } catch (error: any) {
    // Fix 5: Specific log to help you identify if it's a Rules issue or a Network issue
    console.error('Firestore Error in checkForActiveRide:', error.code, error.message);
    return null;
  }
};

// ── Check for any active ride for a driver ──────────────────────────────────
export const checkForActiveDriverRide = async (driverId: string): Promise<string | null> => {
  if (!driverId) return null;

  try {
    const ridesRef = collection(db, 'rides');
    // Assuming driver object is stored in ride doc as `driver: { uid: ... }`
    // Firebase query for nested fields:
    const q = query(
      ridesRef,
      where('driver.uid', '==', driverId),
      where('status', 'in', ['ACCEPTED', 'STARTED']),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    return null;
  } catch (error: any) {
    console.error('Firestore Error in checkForActiveDriverRide:', error.code, error.message);
    return null;
  }
};