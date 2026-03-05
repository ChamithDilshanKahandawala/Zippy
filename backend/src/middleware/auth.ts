import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';
import { UserRole } from '../types/user';

// ─── Augment Express Request with verified user data ─────────────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        role: UserRole;
      };
    }
  }
}

/**
 * verifyToken
 * -----------
 * Extracts the Bearer token from the Authorization header,
 * verifies it against Firebase Auth, and attaches the decoded
 * user payload to req.user.
 */
export const verifyToken = async (
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ success: false, error: 'Missing or invalid Authorization header.' });
    return;
  }

  const idToken = authHeader.split('Bearer ')[1];

  try {
    const decoded = await auth.verifyIdToken(idToken);

    // Fetch the user's role from Firestore (source of truth for roles)
    const userSnap = await db.collection('users').doc(decoded.uid).get();

    if (!userSnap.exists) {
      res.status(401).json({ success: false, error: 'User profile not found. Please register first.' });
      return;
    }

    const userData = userSnap.data()!;

    req.user = {
      uid: decoded.uid,
      email: decoded.email ?? '',
      role: userData.role as UserRole,
    };

    next();
  } catch (err) {
    console.error('⚠️ Token verification failed:', err);
    res.status(401).json({ success: false, error: 'Invalid or expired token.' });
  }
};

/**
 * checkRole(allowedRoles)
 * -----------------------
 * Role-guard middleware factory. Runs AFTER verifyToken.
 * Rejects the request if req.user.role is not in the allowedRoles list.
 *
 * Usage:
 *   router.get('/admin/dashboard', verifyToken, checkRole(['admin']), handler)
 */
export const checkRole = (allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: `Access denied. Required role: [${allowedRoles.join(', ')}]. Your role: ${req.user.role}.`,
      });
      return;
    }

    next();
  };
};
