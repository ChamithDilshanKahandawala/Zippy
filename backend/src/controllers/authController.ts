import { Request, Response } from 'express';
import { auth, db } from '../config/firebase';
import { RegisterRequestBody, UserDocument } from '../types/user';
import admin from 'firebase-admin';

const VALID_ROLES = ['user', 'driver', 'admin'] as const;

/**
 * POST /auth/register
 * -------------------
 * 1. Validates request body.
 * 2. Creates a Firebase Auth user.
 * 3. Atomically writes the Firestore user document.
 * 4. SENIOR PATTERN: If Firestore write fails, the Auth user is deleted
 *    immediately to prevent orphaned accounts.
 */
export const register = async (req: Request, res: Response): Promise<void> => {
  const { email, password, fullName, phoneNumber, role } =
    req.body as RegisterRequestBody;

  // ─── Input validation ──────────────────────────────────────────────────────
  if (!email || !password || !fullName || !phoneNumber || !role) {
    res.status(400).json({
      success: false,
      error: 'All fields are required: email, password, fullName, phoneNumber, role.',
    });
    return;
  }

  if (!VALID_ROLES.includes(role)) {
    res.status(400).json({
      success: false,
      error: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}.`,
    });
    return;
  }

  if (password.length < 8) {
    res.status(400).json({
      success: false,
      error: 'Password must be at least 8 characters.',
    });
    return;
  }

  // ─── Step 1: Create Firebase Auth user ────────────────────────────────────
  let userRecord;
  try {
    userRecord = await auth.createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: fullName.trim(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auth creation failed.';
    // Handle known Firebase Auth errors gracefully
    if (message.includes('email-already-exists')) {
      res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    } else {
      res.status(500).json({ success: false, error: message });
    }
    return;
  }

  // ─── Step 2: Write to Firestore ───────────────────────────────────────────
  const userDoc: UserDocument = {
    uid: userRecord.uid,
    email: email.trim().toLowerCase(),
    fullName: fullName.trim(),
    phoneNumber: phoneNumber.trim(),
    role,
    isVerified: role === 'user', // users are auto-verified; drivers need admin approval
    rating: 5.0,
    emergencyContact: '',
    createdAt: admin.firestore.Timestamp.now(),
  };

  try {
    await db.collection('users').doc(userRecord.uid).set(userDoc);
  } catch (firestoreErr) {
    // ── SENIOR PATTERN: Clean up Auth user to prevent orphaned accounts ──────
    console.error(
      `🚨 Firestore write failed for uid ${userRecord.uid}. Rolling back Auth user...`,
      firestoreErr,
    );
    try {
      await auth.deleteUser(userRecord.uid);
      console.log(`♻️  Auth user ${userRecord.uid} deleted after Firestore failure.`);
    } catch (deleteErr) {
      console.error('💥 CRITICAL: Auth rollback also failed:', deleteErr);
    }

    res.status(500).json({
      success: false,
      error: 'Registration failed due to a database error. Please try again.',
    });
    return;
  }

  // ─── Step 3: Return success (omit sensitive fields) ───────────────────────
  res.status(201).json({
    success: true,
    message: `Account created successfully as ${role}.`,
    user: {
      uid: userRecord.uid,
      email: userDoc.email,
      fullName: userDoc.fullName,
      phoneNumber: userDoc.phoneNumber,
      role: userDoc.role,
      isVerified: userDoc.isVerified,
    },
  });
};
