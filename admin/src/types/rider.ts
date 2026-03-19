export interface RiderDocument {
  nicUrl?: string;
  licenseUrl?: string;
  insuranceUrl?: string;
}

export interface RiderDetails {
  vehicleModel: string;
  vehiclePlate: string;
  vehicleType: 'tuk' | 'budget' | 'luxury';
  documents: RiderDocument;
  rejectionReason?: string;
}

export interface Rider {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isVerified: boolean;
  createdAt?: any;
  riderDetails?: RiderDetails;
}
