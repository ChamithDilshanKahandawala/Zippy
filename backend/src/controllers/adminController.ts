import { Request, Response } from 'express';
import { db } from '../config/firebase';

/**
 * GET /admin/dashboard
 * --------------------
 * Returns admin-level summary data.
 * Protected by verifyToken + checkRole(['admin']).
 */
export const getDashboard = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    message: '🛡️ Welcome to the admin dashboard.',
    data: {
      note: 'Only admins can see this.',
    },
  });
};

/**
 * GET /admin/stats
 * ----------------
 * Returns live user counts broken down by role from Firestore.
 * Protected by verifyToken + checkRole(['admin']).
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const usersSnap = await db.collection('users').get();

    const counts = { user: 0, driver: 0, admin: 0, total: 0 };

    usersSnap.forEach((doc) => {
      const role = doc.data().role as keyof typeof counts;
      if (role in counts) counts[role]++;
      counts.total++;
    });

    res.status(200).json({
      success: true,
      stats: {
        totalUsers: counts.total,
        users: counts.user,
        drivers: counts.driver,
        admins: counts.admin,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    console.error('❌ Failed to fetch admin stats:', err);
    res.status(500).json({ success: false, error: 'Failed to fetch stats.' });
  }
};
