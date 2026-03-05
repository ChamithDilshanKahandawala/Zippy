import { Router } from 'express';
import { register } from '../controllers/authController';

const router = Router();

/**
 * @route  POST /auth/register
 * @desc   Create Firebase Auth user + Firestore profile atomically
 * @access Public
 */
router.post('/register', register);

export default router;
