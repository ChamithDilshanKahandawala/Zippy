import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';
import { UserRole } from '../types/user';

// ─── Extend Express Request type to include user ────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
      };
      userRole?: UserRole;
    }
  }
}

/**
 * Middleware: Verify Firebase ID Token
 * Extracts token from Authorization header and verifies it
 */
export const verifyIdToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ success: false, error: 'No authorization token provided' });
      return;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await auth.verifyIdToken(token);

    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
    };

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      error: 'Authentication failed: Invalid or expired token',
    });
  }
};

/**
 * Middleware: Verify User Role
 * Checks Firestore user document to verify role
 * Must be called AFTER verifyIdToken
 */
export const verifyRole = (allowedRoles: UserRole[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      // Get user document from Firestore (source of truth for roles)
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const userData = userDoc.data();

      if (!userData || !userDoc.exists) {
        res.status(404).json({ success: false, error: 'User profile not found' });
        return;
      }

      if (!allowedRoles.includes(userData.role as UserRole)) {
        res.status(403).json({
          success: false,
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        });
        return;
      }

      req.userRole = userData.role as UserRole;
      next();
    } catch (error) {
      res.status(500).json({ success: false, error: 'Role verification failed' });
    }
  };
};
