import { Router } from 'express';
import { requestDispatch, acceptRide, declineRide, updateRideStatus, completeRide, rateRide } from '../controllers/rideController';
import { verifyIdToken } from '../middleware/auth';

const router = Router();

// Endpoint to trigger matching (normally called from frontend after creating PENDING ride)
router.post('/dispatch', requestDispatch);

// Driver endpoints
router.post('/:rideId/accept', verifyIdToken, acceptRide);
router.post('/:rideId/decline', verifyIdToken, declineRide);
router.post('/:rideId/status', verifyIdToken, updateRideStatus);
router.post('/:rideId/complete', verifyIdToken, completeRide);

// Shared
router.post('/:rideId/rate', verifyIdToken, rateRide);

export default router;
