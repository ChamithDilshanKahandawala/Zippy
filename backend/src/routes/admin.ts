import { Router } from 'express';
import { getDashboard, getStats } from '../controllers/adminController';
import { verifyToken, checkRole } from '../middleware/auth';

const router = Router();

// Both routes below require a valid token AND the 'admin' role.
// A 'rider' or 'driver' token will receive a 403 Forbidden response.

/**
 * @route  GET /admin/dashboard
 * @desc   Admin-only dashboard entry
 * @access Private — admin
 */
router.get('/dashboard', verifyToken, checkRole(['admin']), getDashboard);

/**
 * @route  GET /admin/stats
 * @desc   Live user count breakdown by role
 * @access Private — admin
 */
router.get('/stats', verifyToken, checkRole(['admin']), getStats);

export default router;
