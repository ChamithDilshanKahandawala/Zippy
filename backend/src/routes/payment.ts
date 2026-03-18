import express from 'express';
import { verifyPayment, initiatePayment } from '../controllers/paymentController';

const router = express.Router();

router.post('/initiate', initiatePayment);
router.post('/verify', verifyPayment);

export default router;
