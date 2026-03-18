import { Request, Response } from 'express';
import { db } from '../config/firebase';

/**
 * GET /api/user/profile
 * Returns the current authenticated user's profile
 */
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.status(200).json({
      success: true,
      data: userDoc.data(),
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
};

/**
 * PATCH /api/user/profile
 * Updates User profile fields
 */
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { fullName, phoneNumber, profilePicUrl, emergencyContact, homeAddress, workAddress } = req.body;
    
    const updateData: any = {};
    if (fullName) updateData.fullName = fullName.trim();
    if (phoneNumber) updateData.phoneNumber = phoneNumber.trim();
    if (profilePicUrl) updateData.profilePicUrl = profilePicUrl;
    if (emergencyContact !== undefined) updateData.emergencyContact = emergencyContact.trim();
    if (homeAddress !== undefined) updateData.homeAddress = homeAddress.trim();
    if (workAddress !== undefined) updateData.workAddress = workAddress.trim();

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({ success: false, error: 'No data provided to update' });
      return;
    }

    await db.collection('users').doc(req.user.uid).update(updateData);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update profile' });
  }
};

/**
 * DELETE /api/user/profile
 * Deletes the user's Firestore document AND Firebase Auth account
 */
export const deleteProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }

    const { uid } = req.user;

    // Delete from Firestore
    await db.collection('users').doc(uid).delete();

    // Delete from Firebase Auth
    const { auth } = await import('../config/firebase');
    await auth.deleteUser(uid);

    res.status(200).json({
      success: true,
      message: 'Account deleted successfully',
    });
  } catch (error) {
    console.error('Delete profile error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete account' });
  }
};
