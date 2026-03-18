import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import {
  initializeAuth,
  getAuth,
  Auth,
} from 'firebase/auth';
// @ts-ignore - Some versions of firebase SDK have different export paths for react-native persistence
import { getReactNativePersistence } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey:            process.env.EXPO_PUBLIC_FIREBASE_API_KEY   as string,
  authDomain:        process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId:         process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID  as string,
  storageBucket:     process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId:             process.env.EXPO_PUBLIC_FIREBASE_APP_ID     as string,
};

// ── App init: guard against hot-reload double-init ──────────────────────────
const app: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// ── Auth init: MUST also be guarded because initializeAuth throws
//    if called twice on the same app (unlike initializeApp which is idempotent)
let auth: Auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage),
  });
} catch {
  // Already initialized during hot reload — getAuth() returns the existing instance
  auth = getAuth(app);
}

import { getStorage, FirebaseStorage } from 'firebase/storage';

// ... existing code ...

export { auth };
export const db: Firestore = getFirestore(app);
export const storage: FirebaseStorage = getStorage(app);
export default app;
