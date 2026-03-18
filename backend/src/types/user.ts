/**
 * User roles available in the Zippy platform.
 */
export type UserRole = 'user' | 'driver' | 'admin';

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
