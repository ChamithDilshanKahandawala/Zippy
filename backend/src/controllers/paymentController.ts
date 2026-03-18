import { Request, Response } from 'express';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ─── Payment Verify Webhook ────────────────────────────────────────────────
// POST /api/payment/verify
// Body: { signature: string, transactionId: string, userId: string, amount: number, status: 'SUCCESS' | 'FAILED' }
export const verifyPayment = async (req: Request, res: Response) => {
  const { signature, transactionId, userId, amount, status } = req.body;

  try {
    // 1. Validate inputs
    if (!userId || !amount || !transactionId || !signature) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // 2. Verify Signature (Mock logic: In production, verify against gateway secret)
    // Example: const isValid = createHmac('sha256', process.env.PAYMENT_SECRET).update(transactionId).digest('hex') === signature;
    const isValid = true; 

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid Payment Signature' });
    }

    if (status !== 'SUCCESS') {
       // Log failure
       await db.collection('transactions').doc(transactionId).set({
         userId,
         amount: Number(amount),
         type: 'topup',
         status: 'failed',
         method: 'gateway',
         timestamp: admin.firestore.FieldValue.serverTimestamp(),
         details: { signature }
       });
       return res.status(200).json({ message: 'Transaction recorded as failed' });
    }

    // 3. Start Firestore Transaction
    await db.runTransaction(async (t) => {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await t.get(userRef);

      if (!userDoc.exists) {
        throw new Error('User does not exist');
      }

      // Check if transaction already processed (Idempotency)
      const txRef = db.collection('transactions').doc(transactionId);
      const txDoc = await t.get(txRef);
      if (txDoc.exists) {
        return; // Already processed
      }

      // Update Wallet
      const currentBalance = userDoc.data()?.walletBalance || 0;
      const newBalance = currentBalance + Number(amount);

      t.update(userRef, { walletBalance: newBalance });

      // Create Transaction Record
      t.set(txRef, {
        userId,
        amount: Number(amount),
        type: 'topup', // Credit
        status: 'success',
        method: 'gateway',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        description: 'Wallet Top-up'
      });
    });

    return res.status(200).json({ 
      success: true, 
      message: 'Payment Verified & Wallet Updated' 
    });

  } catch (error: any) {
    console.error('Verify Payment Error:', error);
    return res.status(500).json({ error: error.message });
  }
};

// ─── Initiate Payment Intent ────────────────────────────────────────────────
// POST /api/payment/initiate
export const initiatePayment = async (req: Request, res: Response) => {
  const { amount, currency = 'LKR' } = req.body;
  
  // Here we would call Stripe/PayHere API to get a client_secret or hash
  // Mock response for frontend integration
  
  const mockIntent = {
    clientSecret: `pi_mock_${Date.now()}_secret_${Math.random().toString(36).substring(7)}`,
    transactionId: `txn_${Date.now()}`,
    amount,
    currency
  };
  
  res.json({ data: mockIntent });
};
