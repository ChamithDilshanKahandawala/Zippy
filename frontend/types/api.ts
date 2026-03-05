import { FirebaseError } from 'firebase/app';

export type UserRole = 'user' | 'driver' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  isVerified: boolean;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
}

export interface ApiResponse<T = undefined> {
  success: boolean;
  message?: string;
  error?: string;
  user?: T;
}

export { FirebaseError };
