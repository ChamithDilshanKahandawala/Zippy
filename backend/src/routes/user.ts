import { Router } from 'express';
import { getProfile, updateProfile, deleteProfile } from '../controllers/userController';
import { verifyIdToken } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(verifyIdToken);

router.get('/profile', getProfile);
router.patch('/profile', updateProfile);
router.patch('/update', updateProfile); // PRD v1.3 specific alias
router.delete('/profile', deleteProfile);

export default router;
