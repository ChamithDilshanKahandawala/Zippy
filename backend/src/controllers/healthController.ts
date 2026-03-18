import { Request, Response } from 'express';
import { db } from '../config/firebase';

/**
 * GET /api/health
 * Returns server + Firebase connection status
 */
export const getHealth = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Test Firestore connection
    await db.collection('_health').doc('ping').set({
      timestamp: new Date(),
    });

    res.status(200).json({
      success: true,
      status: 'ok',
      message: 'Zippy backend is running 🚗',
      firebase: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'degraded',
      message: 'Backend is running but Firebase is unavailable',
      firebase: 'disconnected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    });
  }
};
