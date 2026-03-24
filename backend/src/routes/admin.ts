import { Router } from 'express';
import {
  getDashboard,
  getStats,
  getPendingDrivers,
  approveDriver,
  rejectDriver,
  notifyDriver,
} from '../controllers/adminController';
import { verifyIdToken, verifyRole } from '../middleware/auth';

const router = Router();

// Middleware to protect all routes in this router
router.use(verifyIdToken, verifyRole(['admin']));

/**
 * @route  GET /api/admin/dashboard
 */
router.get('/dashboard', getDashboard);

/**
 * @route  GET /api/admin/stats
 */
router.get('/stats', getStats);

/**
 * @route  GET /api/admin/drivers/pending
 */
router.get('/drivers/pending', getPendingDrivers);

/**
 * @route  POST /api/admin/drivers/:driverId/approve
 */
router.post('/drivers/:driverId/approve', approveDriver);

/**
 * @route  POST /api/admin/drivers/:driverId/reject
 */
router.post('/drivers/:driverId/reject', rejectDriver);

/**
 * @route  POST /api/admin/drivers/:driverId/notify
 */
router.post('/drivers/:driverId/notify', notifyDriver);

export default router;
