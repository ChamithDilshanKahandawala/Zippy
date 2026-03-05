import { Request, Response } from 'express';
import { db } from '../config/firebase';

/**
 * GET /api/health
 * Returns the server status and a Firebase connectivity check.
 */
export const healthCheck = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Ping Firestore to verify connectivity
    await db.collection('_health').limit(1).get();

    res.status(200).json({
      success: true,
      status: 'ok',
      message: '🚖 Zippy backend is running!',
      firebase: 'connected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
    });
  } catch (error) {
    // Server is up but Firebase is not reachable
    res.status(200).json({
      success: true,
      status: 'degraded',
      message: '🚖 Zippy backend is running (Firebase unreachable)',
      firebase: 'disconnected',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV ?? 'development',
    });
  }
};
