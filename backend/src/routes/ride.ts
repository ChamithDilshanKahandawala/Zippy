import { Router } from 'express';
import { requestDispatch, acceptRide, declineRide } from '../controllers/rideController';
import { verifyIdToken } from '../middleware/auth';

const router = Router();

// Endpoint to trigger matching (normally called from frontend after creating PENDING ride)
router.post('/dispatch', requestDispatch);

// Driver endpoints
router.post('/:rideId/accept', verifyIdToken, acceptRide);
router.post('/:rideId/decline', verifyIdToken, declineRide);

export default router;
