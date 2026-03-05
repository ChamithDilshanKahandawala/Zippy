import { Router } from 'express';
import { healthCheck } from '../controllers/healthController';

const router = Router();

/**
 * @route  GET /api/health
 * @desc   Health check — confirms backend + Firebase are live
 * @access Public
 */
router.get('/', healthCheck);

export default router;
