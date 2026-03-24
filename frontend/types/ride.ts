// The status of a ride
export type RideStatus = 'PENDING' | 'SEARCHING' | 'ACCEPTED' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

// GeoPoint is the native Firestore type, but using a JS object for consistency:
export interface LocationData {
  latitude: number;
  longitude: number;
  address?: string; // Optional for now
}

// Driver information embedded in the ride (denormalized for performance)
export interface DriverInfo {
  uid: string;
  fullName: string;
  phoneNumber: string;
  profilePicUrl?: string; // Optional
  rating: number;
  vehicleModel: string;
  vehiclePlate: string;
}

// The main Ride interface
export interface Ride {
  id: string; // The Firestore doc ID
  riderId: string;
  status: RideStatus;
  
  // Locations
  origin: LocationData;
  destination: LocationData;
  
  // Pricing & Ride details
  rideType: string;
  estimatedFare: number;
  finalFare?: number; // Calculated at end of trip
  paymentStatus?: 'PAID' | 'PENDING';
  ratingByPassenger?: number;
  ratingByRider?: number;
  
  // Driver assignment
  driverId?: string;
  driver?: DriverInfo;
  
  // Timestamps (Firestore Timestamps are objects like { _seconds, _nanoseconds })
  createdAt: any; 
  acceptedAt?: any;
  startedAt?: any;
  completedAt?: any;
  cancelledAt?: any;
}
