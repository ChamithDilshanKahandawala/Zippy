import { Router } from 'express';
import { getHealth } from '../controllers/healthController';

const router = Router();

/**
 * @route  GET /api/health
 * @desc   Check backend + Firebase connection status
 * @access Public
 */
router.get('/', getHealth);

export default router;
