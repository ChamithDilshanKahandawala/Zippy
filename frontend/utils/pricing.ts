export type VehicleType = 'tuk' | 'budget' | 'luxury';

interface PricingTier {
  id: VehicleType;
  label: string;
  baseFare: number;
  perKm: number;
  icon: string;
  defaultEta: string;
}

export const PRICING_TIERS: Record<VehicleType, PricingTier> = {
  tuk: {
    id: 'tuk',
    label: 'Zippy Tuk',
    baseFare: 100,
    perKm: 80,
    icon: '🛺',
    defaultEta: '3 min',
  },
  budget: {
    id: 'budget',
    label: 'Zippy Budget',
    baseFare: 150,
    perKm: 100,
    icon: '🚗',
    defaultEta: '5 min',
  },
  luxury: {
    id: 'luxury',
    label: 'Zippy Luxury',
    baseFare: 250,
    perKm: 180,
    icon: '🚙',
    defaultEta: '8 min',
  },
};

export const calculateFare = (vehicleType: VehicleType, distanceKm: number): number => {
  const tier = PRICING_TIERS[vehicleType];
  if (!tier) return 0;
  
  const fare = tier.baseFare + (distanceKm * tier.perKm);
  // Round to nearest 10 for cleaner pricing
  return Math.ceil(fare / 10) * 10;
};

export const estimateDuration = (vehicleType: VehicleType, durationMin: number): string => {
  // Add some buffer based on vehicle type if needed
  // For now return the raw Google Maps duration
  return `${Math.ceil(durationMin)} min`;
};
