import { FirebaseError } from 'firebase/app';

export type UserRole = 'user' | 'driver' | 'admin';

export interface UserProfile {
  uid: string;
  email: string;
  fullName: string;
  phoneNumber: string;
  role: UserRole;
  isVerified: boolean;
  profilePicUrl?: string;
  rating?: number;
  emergencyContact?: string;
  homeAddress?: string;
  workAddress?: string;
  createdAt: { _seconds: number; _nanoseconds: number };
  currentLocation?: { latitude: number; longitude: number };
  notificationsEnabled?: boolean;
  pushToken?: string;
  walletBalance?: number; // Primary wallet balance
  riderDetails?: {
    vehicleType?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
    isOnline?: boolean;
  };
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

export interface HealthCheckResponse {
  success: boolean;
  status: string;
  message: string;
  firebase: string;
  timestamp: string;
  environment: string;
}

export { FirebaseError };
