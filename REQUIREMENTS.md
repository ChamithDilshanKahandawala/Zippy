# Zippy Development Requirements & Roadmap 🚗

**Status:** Work in Progress (WIP)  
**Last Updated:** March 10, 2026  
**Target:** Functional MVP in 4-6 weeks

---

## 🎯 Project Phases Overview

```
PHASE 1: BACKEND FOUNDATION (Week 1-2) ← START HERE
    ↓
PHASE 2: FRONTEND SCREENS (Week 2-3)
    ↓
PHASE 3: CORE FEATURES (Week 3-4)
    ↓
PHASE 4: ADMIN & TESTING (Week 4-5)
    ↓
PHASE 5: POLISH & DEPLOY (Week 5-6)
```

---

# 🔴 PHASE 1: BACKEND FOUNDATION (Week 1-2)

### Goal: Complete backend API with all required endpoints

---

## TASK 1.1: Setup Backend Environment ✅

**Difficulty:** Easy | **Time:** 30 mins

### Steps:

1. **Install dependencies**
   ```bash
   cd backend
   npm install
   ```

2. **Create `.env` file from template**
   ```bash
   cp .env.example .env  # (create .env.example first - see below)
   ```

3. **Test backend runs**
   ```bash
   npm run dev
   # Should see: ✅ Server running on port 3000
   ```

### Deliverable:
- [ ] Backend starts without errors
- [ ] Console shows "✅ Firebase Admin SDK initialized"
- [ ] Port 3000 is listening

---

## TASK 1.2: Create `.env.example` File

**Difficulty:** Easy | **Time:** 15 mins

### Steps:

1. **Create file** `backend/.env.example`

2. **Add this content:**

```env
# ─── Server ────────────────────────────────────────────────────────
PORT=3000
NODE_ENV=development
LOG_LEVEL=info

# ─── CORS (Frontend URLs that can call this API) ─────────────────
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8081,exp://localhost:19000

# ─── Firebase Admin Credentials ─────────────────────────────────
FIREBASE_PROJECT_ID=your-project-id-here
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
```

3. **Fill in real values**:
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Copy `project_id`, `client_email`, `private_key` into `.env`

### Deliverable:
- [ ] `.env.example` file created with template
- [ ] `.env` file filled with real Firebase credentials
- [ ] Backend starts with Firebase connected

---

## TASK 1.3: Implement Health Check Endpoint

**Difficulty:** Easy | **Time:** 20 mins

### Why This Matters:
Frontend calls `/api/health` to verify backend is running. Currently unimplemented.

### Steps:

1. **Create** `backend/src/controllers/healthController.ts`

```typescript
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
```

2. **Update** `backend/src/routes/health.ts`

```typescript
import { Router } from 'express';
import { getHealth } from '../controllers/healthController';

const router = Router();

/**
 * @route  GET /api/health
 * @desc   Check backend + Firebase connection status
 * @access Public
 */
router.get('/', getHealth);

export default router;
```

3. **Test endpoint**
   ```bash
   curl http://localhost:3000/api/health
   ```

### Deliverable:
- [ ] Health endpoint returns `{ success: true, status: 'ok', firebase: 'connected' }`
- [ ] Can be called from frontend

---

## TASK 1.4: Create Auth Middleware

**Difficulty:** Medium | **Time:** 45 mins

### Why This Matters:
Currently any unauthenticated user can call protected endpoints. Middleware will verify Firebase ID tokens.

### Steps:

1. **Create** `backend/src/middleware/auth.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { auth, db } from '../config/firebase';

// ─── Extend Express Request type to include user ────────────────
declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        email: string;
        emailVerified: boolean;
      };
      userRole?: 'admin' | 'driver' | 'user';
    }
  }
}

/**
 * Middleware: Verify Firebase ID Token
 * Extracts token from Authorization header and verifies with Firebase
 * Sets req.user if valid, otherwise responds 401
 */
export const verifyIdToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split('Bearer ')[1];

    if (!token) {
      res.status(401).json({
        success: false,
        error: 'No authorization token provided',
      });
      return;
    }

    // Verify token with Firebase
    const decodedToken = await auth.verifyIdToken(token);

    // Attach user info to request
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email || '',
      emailVerified: decodedToken.email_verified || false,
    };

    next();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid token';
    res.status(401).json({
      success: false,
      error: `Authentication failed: ${message}`,
    });
  }
};

/**
 * Middleware: Verify User Role
 * Checks Firestore user document to verify role
 * Must be called AFTER verifyIdToken
 */
export const verifyRole = (allowedRoles: string[]) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'User not authenticated' });
        return;
      }

      // Get user document from Firestore
      const userDoc = await db.collection('users').doc(req.user.uid).get();
      const userData = userDoc.data();

      if (!userData) {
        res.status(404).json({ success: false, error: 'User profile not found' });
        return;
      }

      if (!allowedRoles.includes(userData.role)) {
        res.status(403).json({
          success: false,
          error: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        });
        return;
      }

      // Attach role to request
      req.userRole = userData.role;
      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: 'Role verification failed',
      });
    }
  };
};
```

2. **Test middleware** (after Task 1.5)

### Deliverable:
- [ ] `auth.ts` middleware created
- [ ] `verifyIdToken` function works with Firebase tokens
- [ ] `verifyRole` function checks user role from Firestore

---

## TASK 1.5: Implement Admin Endpoints

**Difficulty:** Medium | **Time:** 60 mins

### Why This Matters:
Admin needs to approve pending drivers. Currently no endpoints exist.

### Steps:

1. **Create** `backend/src/controllers/adminController.ts`

```typescript
import { Request, Response } from 'express';
import { db } from '../config/firebase';

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
```

2. **Update** `backend/src/routes/admin.ts`

```typescript
import { Router } from 'express';
import { verifyIdToken, verifyRole } from '../middleware/auth';
import {
  getStats,
  getPendingDrivers,
  approveDriver,
  rejectDriver,
} from '../controllers/adminController';

const router = Router();

// All admin routes require admin role
router.use(verifyIdToken, verifyRole(['admin']));

/**
 * @route  GET /api/admin/stats
 * @desc   Get platform statistics
 * @access Admin only
 */
router.get('/stats', getStats);

/**
 * @route  GET /api/admin/drivers/pending
 * @desc   Get list of pending drivers
 * @access Admin only
 */
router.get('/drivers/pending', getPendingDrivers);

/**
 * @route  POST /api/admin/drivers/:driverId/approve
 * @desc   Approve a pending driver
 * @access Admin only
 */
router.post('/drivers/:driverId/approve', approveDriver);

/**
 * @route  POST /api/admin/drivers/:driverId/reject
 * @desc   Reject a pending driver
 * @access Admin only
 */
router.post('/drivers/:driverId/reject', rejectDriver);

export default router;
```

3. **Test admin endpoints**
   ```bash
   # Get pending drivers (replace TOKEN with real Firebase token)
   curl -H "Authorization: Bearer TOKEN" http://localhost:3000/api/admin/drivers/pending
   ```

### Deliverable:
- [ ] Admin can fetch stats
- [ ] Admin can list pending drivers
- [ ] Admin can approve/reject drivers
- [ ] Non-admin users get 403 error

---

## TASK 1.6: Setup Error Handler Middleware

**Difficulty:** Easy | **Time:** 30 mins

### Why This Matters:
Unhandled errors crash backend. Middleware will catch all errors gracefully.

### Steps:

1. **Update** `backend/src/middleware/errorHandler.ts`

```typescript
import { Request, Response, NextFunction } from 'express';

interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Global error handler middleware
 * Catches unhandled errors and returns consistent JSON response
 */
export const errorHandler = (
  err: ApiError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const status = err.status || 500;
  const message = err.message || 'Internal Server Error';

  console.error(`[${status}] ${message}`, err);

  res.status(status).json({
    success: false,
    error: message,
    code: err.code,
    timestamp: new Date().toISOString(),
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

/**
 * 404 handler
 */
export const notFoundHandler = (_req: Request, res: Response): void => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    timestamp: new Date().toISOString(),
  });
};
```

2. **Update** `backend/src/index.ts` to use error handlers

```typescript
// ... existing middleware ...

app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);

// 404 handler (before error handler)
app.use(notFoundHandler);

// Global error handler (MUST be last)
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
```

### Deliverable:
- [ ] 404 errors return proper JSON
- [ ] Unhandled errors return 500 with message
- [ ] Error messages logged to console

---

## TASK 1.7: Add Request Validation Middleware

**Difficulty:** Medium | **Time:** 45 mins

### Why This Matters:
Currently no validation on inputs. Someone could send junk data and crash backend.

### Steps:

1. **Install validation library**
   ```bash
   cd backend
   npm install express-validator
   ```

2. **Create** `backend/src/middleware/validation.ts`

```typescript
import { body, validationResult, Request, Response, NextFunction } from 'express-validator';

/**
 * Middleware: Check validation errors from express-validator
 * If errors found, returns 400 with error details
 */
export const handleValidationErrors = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array().map((e) => ({
        field: e.type === 'field' ? (e as any).path : e.type,
        message: e.msg,
      })),
    });
    return;
  }
  next();
};

/**
 * Validation rules for user registration
 */
export const validateRegister = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters'),
  body('fullName')
    .notEmpty()
    .withMessage('Full name is required')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be 2-50 characters'),
  body('phoneNumber')
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^\+?[0-9]{10,15}$/)
    .withMessage('Invalid phone number format'),
  body('role')
    .isIn(['user', 'driver', 'admin'])
    .withMessage('Role must be user, driver, or admin'),
];
```

3. **Update** `backend/src/routes/auth.ts`

```typescript
import { Router } from 'express';
import { register } from '../controllers/authController';
import { validateRegister, handleValidationErrors } from '../middleware/validation';

const router = Router();

/**
 * @route  POST /auth/register
 * @desc   Create Firebase Auth user + Firestore profile atomically
 * @access Public
 */
router.post(
  '/register',
  validateRegister,
  handleValidationErrors,
  register
);

export default router;
```

### Deliverable:
- [ ] Invalid emails rejected
- [ ] Short passwords rejected
- [ ] Invalid phone numbers rejected
- [ ] Validation errors return 400 with details

---

## TASK 1.8: Add Rate Limiting

**Difficulty:** Easy | **Time:** 20 mins

### Why This Matters:
Protects against brute-force attacks (e.g., trying 1000 passwords).

### Steps:

1. **Install rate limiter**
   ```bash
   npm install express-rate-limit
   ```

2. **Create** `backend/src/middleware/rateLimit.ts`

```typescript
import rateLimit from 'express-rate-limit';

/**
 * General rate limiter: 100 requests per 15 minutes per IP
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // requests per window
  message: { success: false, error: 'Too many requests, please try again later' },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  skip: (req) => process.env.NODE_ENV === 'test', // Skip in tests
});

/**
 * Strict rate limiter for auth endpoints: 5 attempts per 15 minutes
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { success: false, error: 'Too many auth attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true, // Only count failed attempts
});
```

3. **Update** `backend/src/index.ts`

```typescript
import { globalLimiter, authLimiter } from './middleware/rateLimit';

// Apply global rate limiter
app.use(globalLimiter);

// Apply stricter limiter to auth routes
app.use('/api/auth', authLimiter);

app.use('/api/auth', authRouter);
```

### Deliverable:
- [ ] Registration limited to 5 attempts per 15 mins
- [ ] Requests beyond limit return 429 error

---

## ✅ PHASE 1 Completion Checklist

- [ ] Task 1.1: Backend environment setup
- [ ] Task 1.2: `.env.example` created with real credentials
- [ ] Task 1.3: Health endpoint returns `{ status: 'ok' }`
- [ ] Task 1.4: Auth middleware verifies Firebase tokens
- [ ] Task 1.5: Admin endpoints list/approve/reject drivers
- [ ] Task 1.6: Error handlers catch all errors gracefully
- [ ] Task 1.7: Input validation rejects invalid data
- [ ] Task 1.8: Rate limiting prevents brute-force attacks

**When ALL ✅ checked → Move to PHASE 2**

---

# 🟠 PHASE 2: FRONTEND SCREENS (Week 2-3)

### Goal: Build functional UI for all three user roles

---

## TASK 2.1: Setup Frontend Environment

**Difficulty:** Easy | **Time:** 30 mins

### Steps:

1. **Install dependencies**
   ```bash
   cd frontend
   npm install
   ```

2. **Create `.env.local` file**
   ```env
   EXPO_PUBLIC_API_URL=http://localhost:3000
   EXPO_PUBLIC_FIREBASE_CONFIG=your-firebase-config-here
   ```

3. **Test frontend runs**
   ```bash
   npm start
   # Should show: Expo server running at http://localhost:19000
   ```

4. **Test on Android/iOS**
   ```bash
   npm run android  # or npm run ios
   ```

### Deliverable:
- [ ] Frontend starts without errors
- [ ] Can run on Android/iOS emulator
- [ ] Can reach backend health endpoint

---

## TASK 2.2: Build Auth Screens UI

**Difficulty:** Medium | **Time:** 90 mins

### Screens to Update:
- `RegisterScreen.tsx` - Already 90% done, needs final touches
- `SignInScreen.tsx` - Already 90% done, needs final touches

### Steps:

1. **Review existing screens** (already mostly implemented)
2. **Add success/error toasts** (user feedback)
3. **Test registration flow** end-to-end
4. **Test login flow** end-to-end

### Deliverable:
- [ ] User can register with email, password, name, phone
- [ ] User can sign in with email/password
- [ ] Errors displayed clearly
- [ ] Loading states work

---

## TASK 2.3: Build Rider Home Screen

**Difficulty:** High | **Time:** 120 mins

### Features:
- Map showing rider's location
- Search for rides nearby
- List of available rides
- Book a ride

### File: `frontend/screens/rider/HomeScreen.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { useUser } from '../../context/UserContext';

interface Ride {
  id: string;
  driverId: string;
  driverName: string;
  from: string;
  to: string;
  fare: number;
  distance: number;
  rating: number;
  seats: number;
}

export default function RiderHomeScreen() {
  const { user } = useUser();
  const [location, setLocation] = useState(null);
  const [availableRides, setAvailableRides] = useState<Ride[]>([]);
  const [selectedRide, setSelectedRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocation();
    fetchAvailableRides();
  }, []);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const fetchAvailableRides = async () => {
    try {
      setLoading(true);
      // TODO: Call API to fetch rides
      // const rides = await api.getAvailableRides();
      // setAvailableRides(rides);
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load rides');
      setLoading(false);
    }
  };

  const handleBookRide = async (ride: Ride) => {
    try {
      // TODO: Call API to book ride
      // await api.bookRide(ride.id);
      Alert.alert('Success', 'Ride booked! Driver will be with you soon.');
    } catch (error) {
      Alert.alert('Error', 'Failed to book ride');
    }
  };

  return (
    <View className="flex-1 bg-zippy-bg">
      {/* Map */}
      {location && (
        <MapView
          className="flex-1"
          initialRegion={{
            ...location,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />
      )}

      {/* Bottom Sheet: Available Rides */}
      <View className="absolute bottom-0 left-0 right-0 h-1/3 bg-zippy-surface rounded-t-3xl p-4">
        <Text className="text-lg font-bold text-zippy-text mb-4">Available Rides</Text>
        <FlatList
          data={availableRides}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => handleBookRide(item)}
              className="bg-zippy-bg p-4 rounded-xl mb-2 flex-row justify-between items-center"
            >
              <View>
                <Text className="text-zippy-text font-semibold">{item.driverName}</Text>
                <Text className="text-zippy-muted text-sm">{item.from} → {item.to}</Text>
              </View>
              <Text className="text-zippy-accent font-bold">${item.fare}</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}
```

### Deliverable:
- [ ] Map displays rider's location
- [ ] Can search for rides
- [ ] Available rides displayed in list
- [ ] Can book a ride

---

## TASK 2.4: Build Driver Home Screen

**Difficulty:** High | **Time:** **120 mins**

### Features:
- Toggle "Online" status
- List of available ride requests
- Accept/decline rides
- Navigation to pickup location

### File: `frontend/screens/driver/HomeScreen.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, Switch } from 'react-native';
import MapView from 'react-native-maps';
import * as Location from 'expo-location';
import { useUser } from '../../context/UserContext';

interface RideRequest {
  id: string;
  riderId: string;
  riderName: string;
  pickupLocation: string;
  dropoffLocation: string;
  fare: number;
  distance: number;
  rating: number;
}

export default function DriverHomeScreen() {
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState(false);
  const [location, setLocation] = useState(null);
  const [rideRequests, setRideRequests] = useState<RideRequest[]>([]);
  const [currentRide, setCurrentRide] = useState<RideRequest | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getLocation();
    if (isOnline) {
      fetchRideRequests();
    }
  }, [isOnline]);

  const getLocation = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location access is required');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation({
        latitude: loc.coords.latitude,
        longitude: loc.coords.longitude,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to get location');
    }
  };

  const fetchRideRequests = async () => {
    try {
      setLoading(true);
      // TODO: Call API to fetch ride requests
      // const requests = await api.getRideRequests();
      // setRideRequests(requests);
      setLoading(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to load ride requests');
      setLoading(false);
    }
  };

  const handleAcceptRide = async (ride: RideRequest) => {
    try {
      // TODO: Call API to accept ride
      // await api.acceptRide(ride.id);
      setCurrentRide(ride);
      setRideRequests(rideRequests.filter((r) => r.id !== ride.id));
      Alert.alert('Success', 'Ride accepted! Head to pickup location.');
    } catch (error) {
      Alert.alert('Error', 'Failed to accept ride');
    }
  };

  const handleDeclineRide = async (rideId: string) => {
    try {
      // TODO: Call API to decline ride
      setRideRequests(rideRequests.filter((r) => r.id !== rideId));
    } catch (error) {
      Alert.alert('Error', 'Failed to decline ride');
    }
  };

  return (
    <View className="flex-1 bg-zippy-bg">
      {/* Top Bar: Online Status */}
      <View className="bg-zippy-surface p-4 flex-row items-center justify-between">
        <Text className="text-lg font-bold text-zippy-text">
          {isOnline ? '🟢 Online' : '🔴 Offline'}
        </Text>
        <Switch value={isOnline} onValueChange={setIsOnline} />
      </View>

      {/* Map */}
      {location && (
        <MapView
          className="flex-1"
          initialRegion={{
            ...location,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          }}
        />
      )}

      {/* Current Ride or Pending Requests */}
      <View className="absolute bottom-0 left-0 right-0 h-1/3 bg-zippy-surface rounded-t-3xl p-4">
        {currentRide ? (
          <View>
            <Text className="text-lg font-bold text-zippy-text mb-4">Active Ride</Text>
            <View className="bg-zippy-bg p-4 rounded-xl">
              <Text className="text-zippy-accent font-semibold">{currentRide.riderName}</Text>
              <Text className="text-zippy-muted text-sm">{currentRide.pickupLocation}</Text>
              <Text className="text-zippy-muted text-sm">→ {currentRide.dropoffLocation}</Text>
              <TouchableOpacity className="bg-zippy-accent p-3 rounded-lg mt-4">
                <Text className="text-white text-center font-semibold">Complete Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            <Text className="text-lg font-bold text-zippy-text mb-4">Ride Requests</Text>
            <FlatList
              data={rideRequests}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <View className="bg-zippy-bg p-4 rounded-xl mb-2">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-zippy-text font-semibold">{item.riderName}</Text>
                    <Text className="text-zippy-accent font-bold">${item.fare}</Text>
                  </View>
                  <Text className="text-zippy-muted text-sm mb-3">
                    {item.pickupLocation} → {item.dropoffLocation}
                  </Text>
                  <View className="flex-row gap-2">
                    <TouchableOpacity
                      onPress={() => handleAcceptRide(item)}
                      className="flex-1 bg-zippy-accent p-2 rounded-lg"
                    >
                      <Text className="text-white text-center text-sm font-semibold">Accept</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDeclineRide(item.id)}
                      className="flex-1 bg-zippy-error p-2 rounded-lg"
                    >
                      <Text className="text-white text-center text-sm font-semibold">Decline</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          </>
        )}
      </View>
    </View>
  );
}
```

### Deliverable:
- [ ] Driver can toggle online status
- [ ] Ride requests appear in a list
- [ ] Driver can accept/decline rides
- [ ] Active ride displayed on map

---

## TASK 2.5: Build Admin Dashboard Screen

**Difficulty:** High | **Time:** 120 mins

### Features:
- Platform statistics (total users, drivers, pending approvals)
- List of pending drivers
- Approve/reject drivers
- View driver details

### File: `frontend/screens/admin/DashboardScreen.tsx`

```tsx
import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { useUser } from '../../context/UserContext';
import { checkHealth, getAdminStats } from '../../services/api';

interface AdminStats {
  totalUsers: number;
  totalRiders: number;
  totalDrivers: number;
  verifiedDrivers: number;
  pendingDrivers: number;
}

interface PendingDriver {
  uid: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  createdAt: any;
  rating?: number;
}

export default function AdminDashboardScreen() {
  const { firebaseUser } = useUser();
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingDrivers, setPendingDrivers] = useState<PendingDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'stats' | 'drivers'>('stats');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get health status
      const healthCheck = await checkHealth();
      if (!healthCheck.success) {
        Alert.alert('Warning', 'Backend connection issue');
      }

      // Get admin stats
      const idToken = await firebaseUser?.getIdToken();
      if (idToken) {
        const statsResponse = await getAdminStats(idToken);
        setStats(statsResponse.data);
        // TODO: Fetch pending drivers
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveDriver = async (driverId: string) => {
    try {
      // TODO: Call API to approve driver
      setPendingDrivers(pendingDrivers.filter((d) => d.uid !== driverId));
      Alert.alert('Success', 'Driver approved');
    } catch (error) {
      Alert.alert('Error', 'Failed to approve driver');
    }
  };

  const handleRejectDriver = async (driverId: string) => {
    try {
      // TODO: Call API to reject driver
      setPendingDrivers(pendingDrivers.filter((d) => d.uid !== driverId));
      Alert.alert('Success', 'Driver rejected');
    } catch (error) {
      Alert.alert('Error', 'Failed to reject driver');
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-zippy-bg items-center justify-center">
        <ActivityIndicator size="large" color="#7C3AED" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-zippy-bg">
      {/* Header */}
      <View className="bg-zippy-surface p-4">
        <Text className="text-2xl font-bold text-zippy-text">Admin Dashboard</Text>
      </View>

      {/* Tab Navigation */}
      <View className="flex-row bg-zippy-border">
        <TouchableOpacity
          onPress={() => setTab('stats')}
          className={`flex-1 p-4 border-b-2 ${tab === 'stats' ? 'border-zippy-accent' : 'border-transparent'}`}
        >
          <Text className={`text-center font-semibold ${tab === 'stats' ? 'text-zippy-accent' : 'text-zippy-muted'}`}>
            Stats
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setTab('drivers')}
          className={`flex-1 p-4 border-b-2 ${tab === 'drivers' ? 'border-zippy-accent' : 'border-transparent'}`}
        >
          <Text className={`text-center font-semibold ${tab === 'drivers' ? 'text-zippy-accent' : 'text-zippy-muted'}`}>
            Pending Drivers
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      {tab === 'stats' ? (
        <View className="p-4">
          <StatCard label="Total Users" value={stats?.totalUsers || 0} />
          <StatCard label="Total Riders" value={stats?.totalRiders || 0} />
          <StatCard label="Total Drivers" value={stats?.totalDrivers || 0} />
          <StatCard label="Verified Drivers" value={stats?.verifiedDrivers || 0} />
          <StatCard label="Pending Approvals" value={stats?.pendingDrivers || 0} icon="⏳" />
        </View>
      ) : (
        <FlatList
          data={pendingDrivers}
          keyExtractor={(item) => item.uid}
          renderItem={({ item }) => (
            <View className="bg-zippy-surface p-4 m-2 rounded-xl">
              <Text className="text-lg font-bold text-zippy-text">{item.fullName}</Text>
              <Text className="text-zippy-muted text-sm">{item.email}</Text>
              <Text className="text-zippy-muted text-sm">{item.phoneNumber}</Text>
              <View className="flex-row gap-2 mt-3">
                <TouchableOpacity
                  onPress={() => handleApproveDriver(item.uid)}
                  className="flex-1 bg-zippy-accent p-3 rounded-lg"
                >
                  <Text className="text-white text-center font-semibold text-sm">Approve</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleRejectDriver(item.uid)}
                  className="flex-1 bg-zippy-error p-3 rounded-lg"
                >
                  <Text className="text-white text-center font-semibold text-sm">Reject</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          className="p-2"
        />
      )}
    </View>
  );
}

function StatCard({ label, value, icon }: { label: string; value: number; icon?: string }) {
  return (
    <View className="bg-zippy-surface p-4 rounded-xl mb-3 flex-row justify-between items-center">
      <View>
        <Text className="text-zippy-muted text-sm">{label}</Text>
        <Text className="text-2xl font-bold text-zippy-accent">{value}</Text>
      </View>
      {icon && <Text className="text-3xl">{icon}</Text>}
    </View>
  );
}
```

### Deliverable:
- [ ] Admin can view platform stats
- [ ] Admin can see pending drivers list
- [ ] Admin can approve/reject drivers
- [ ] Dashboard updates in real-time

---

## ✅ PHASE 2 Completion Checklist

- [ ] Task 2.1: Frontend environment setup
- [ ] Task 2.2: Auth screens completed (Register + SignIn)
- [ ] Task 2.3: Rider home screen built
- [ ] Task 2.4: Driver home screen built
- [ ] Task 2.5: Admin dashboard built

**When ALL ✅ checked → Move to PHASE 3**

---

# 🟡 PHASE 3: CORE FEATURES (Week 3-4)

### Goal: Implement ride booking, real-time tracking, payments

**Tasks to implement:**
- Ride matching algorithm
- Real-time ride tracking (Firestore + Map updates)
- Rating system (riders rate drivers, drivers rate riders)
- Notifications (Firebase Cloud Messaging)
- Payment integration (Stripe)
- Chat system (optional but nice)

---

# 🟣 PHASE 4: ADMIN & TESTING (Week 4-5)

### Goal: Admin features complete, tests passing

**Tasks to implement:**
- Admin can view all transactions
- Admin can block/unblock users
- Admin can view complaints/support tickets
- Write unit tests (Jest)
- Write integration tests (Supertest)
- E2E tests (Detox)

---

# 🟢 PHASE 5: POLISH & DEPLOY (Week 5-6)

### Goal: Production-ready, deployed to cloud

**Tasks to implement:**
- Performance optimization
- Accessibility review
- Security audit
- Deploy backend to Firebase Functions or Heroku
- Deploy frontend to Expo / App Store / Google Play
- Setup CI/CD pipeline (GitHub Actions)
- Monitoring & error tracking (Sentry)

---

# 📋 Current Status

| Phase | Status | ETA |
|-------|--------|-----|
| Phase 1: Backend Foundation | 🔄 IN PROGRESS | End of Week 1 |
| Phase 2: Frontend Screens | ⏳ TODO | End of Week 2 |
| Phase 3: Core Features | ⏳ TODO | End of Week 3 |
| Phase 4: Admin & Testing | ⏳ TODO | End of Week 4 |
| Phase 5: Polish & Deploy | ⏳ TODO | End of Week 6 |

---

# 🚀 How to Use This Document

1. **Start with PHASE 1** - Complete all 8 tasks
2. **Each task has:**
   - Difficulty level
   - Time estimate
   - Step-by-step instructions
   - Code examples
   - Deliverables checklist

3. **Before moving to next phase:**
   - Make sure ALL items in previous phase are ✅ checked
   - Test thoroughly
   - Commit to git

4. **When stuck:**
   - Re-read the step
   - Check the code example
   - Search online for similar problems
   - Ask for help!

---

# 🎯 Quick Start Commands

**Backend:**
```bash
cd backend
npm install
npm run dev        # Start development server
npm run build      # Build for production
```

**Frontend:**
```bash
cd frontend
npm install
npm start          # Start Expo
npm run android    # Run on Android emulator
npm run ios        # Run on iOS simulator
```

---

**Last Updated:** March 10, 2026  
**Project Lead:** You 🚀  
**Status:** 🟠 PHASE 1 IN PROGRESS

Good luck! 💪
