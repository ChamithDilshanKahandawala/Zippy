/**
 * User roles available in the Zippy platform.
 */
export type UserRole = 'user' | 'driver' | 'admin';

/** Vehicle types supported by Zippy */
export type VehicleType = 'tuk' | 'budget' | 'luxury';

/** Document upload URLs for a driver's verification documents */
export interface RiderDocuments {
  nicUrl: string;       // National ID / Passport
  licenseUrl: string;   // Driving licence
  insuranceUrl: string; // Vehicle insurance certificate
}

/** Rider-specific sub-document (only present when role === 'driver') */
export interface RiderDetails {
  vehicleModel: string;
  vehiclePlate: string;
  vehicleType: VehicleType | '';
  isOnline: boolean;
  documents: RiderDocuments;
  rejectionReason: string; // empty string when not rejected
}

/**
 * Firestore document shape for a user in the `users` collection.
 * This is the canonical schema — keep in sync with frontend types.
 */
export interface UserDocument {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  isVerified: boolean; // false until admin approves (drivers especially)
  profilePicUrl?: string;
  rating?: number;
  emergencyContact?: string;
  homeAddress?: string;
  workAddress?: string;
  createdAt: FirebaseFirestore.Timestamp;
  /** Only present for role === 'driver' */
  riderDetails?: RiderDetails;
}

/**
 * Request body shape for POST /auth/register
 */
export interface RegisterRequestBody {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
}
