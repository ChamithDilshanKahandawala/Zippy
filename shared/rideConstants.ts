/**
 * Ride Status State Machine
 * ─────────────────────────
 * Single source of truth for all ride statuses.
 * Used by: frontend types, backend controllers, Firestore queries.
 *
 *  PENDING → SEARCHING → ACCEPTED → ARRIVED → IN_PROGRESS → COMPLETED
 *                ↓           ↓         ↓          ↓
 *            CANCELLED   CANCELLED  CANCELLED  CANCELLED
 */
export const RIDE_STATUS = {
  PENDING:     'PENDING',
  SEARCHING:   'SEARCHING',
  ACCEPTED:    'ACCEPTED',
  ARRIVED:     'ARRIVED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED:   'COMPLETED',
  CANCELLED:   'CANCELLED',
} as const;

export type RideStatus = typeof RIDE_STATUS[keyof typeof RIDE_STATUS];

/** Statuses that mean "the ride is still active" */
export const ACTIVE_STATUSES: RideStatus[] = [
  RIDE_STATUS.PENDING,
  RIDE_STATUS.SEARCHING,
  RIDE_STATUS.ACCEPTED,
  RIDE_STATUS.ARRIVED,
  RIDE_STATUS.IN_PROGRESS,
];

/** Driver response timeout in milliseconds */
export const DRIVER_RESPONSE_TIMEOUT_MS = 30_000; // 30 seconds

/** Search radius for nearby drivers in meters */
export const SEARCH_RADIUS_M = 10_000; // 10km
