import { Request, Response } from 'express';
import { db } from '../config/firebase';
import { sendPushNotification } from '../services/notificationService';

/**
 * GET /api/admin/dashboard
 * Returns admin-level summary data.
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
 * GET /api/admin/stats
 * Returns platform statistics (requires admin role)
 */
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // Count users by role
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map((doc) => doc.data());

    const stats = {
      totalUsers: users.length,
      totalRiders: users.filter((u) => u.role === 'user').length,
      totalDrivers: users.filter((u) => u.role === 'driver').length,
      verifiedDrivers: users.filter((u) => u.role === 'driver' && u.isVerified).length,
      pendingDrivers: users.filter((u) => u.role === 'driver' && !u.isVerified).length,
    };

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch stats',
    });
  }
};

/**
 * GET /api/admin/drivers/pending
 * Returns list of drivers awaiting verification
 */
export const getPendingDrivers = async (req: Request, res: Response): Promise<void> => {
  try {
    const driversSnap = await db
      .collection('users')
      .where('role', '==', 'driver')
      .where('isVerified', '==', false)
      .get();

    const pendingDrivers = driversSnap.docs.map((doc) => ({
      uid: doc.id,
      ...doc.data(),
    }));

    res.status(200).json({
      success: true,
      data: pendingDrivers,
      count: pendingDrivers.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending drivers',
    });
  }
};

/**
 * POST /api/admin/drivers/:driverId/approve
 * Approve a pending driver
 */
export const approveDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId } = req.params;

    if (!driverId) {
      res.status(400).json({ success: false, error: 'Driver ID required' });
      return;
    }

    // Update driver's isVerified status
    await db.collection('users').doc(driverId).update({
      isVerified: true,
      approvedAt: new Date(),
    });

    res.status(200).json({
      success: true,
      message: `Driver ${driverId} approved`,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to approve driver',
    });
  }
};

/**
 * POST /api/admin/drivers/:driverId/reject
 * Reject a pending driver
 */
export const rejectDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId } = req.params;
    const { reason } = req.body;

    if (!driverId) {
      res.status(400).json({ success: false, error: 'Driver ID required' });
      return;
    }

    // Delete or mark as rejected
    await db.collection('users').doc(driverId).delete();

    res.status(200).json({
      success: true,
      message: `Driver ${driverId} rejected`,
      reason,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to reject driver',
    });
  }
};

/**
 * POST /api/admin/drivers/:driverId/notify
 * Send an ad-hoc push notification for verification status (Approved/Rejected)
 */
export const notifyDriver = async (req: Request, res: Response): Promise<void> => {
  try {
    const { driverId } = req.params;
    const { status, reason } = req.body;

    if (!driverId || !status) {
      res.status(400).json({ success: false, error: 'Driver ID and status required' });
      return;
    }

    if (status === 'approved') {
      await sendPushNotification(
        driverId,
        'Congratulations! 🎉',
        'Your Zippy driver account has been approved. You can now go online and accept rides.',
        { type: 'ACCOUNT_APPROVED' }
      );
    } else if (status === 'rejected') {
      await sendPushNotification(
        driverId,
        'Account Update ⚠️',
        `Your driver application needs attention. Reason: ${reason || 'Please check your app.'}`,
        { type: 'ACCOUNT_REJECTED' }
      );
    }

    res.status(200).json({ success: true, message: 'Notification sent' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to notify driver' });
  }
};
