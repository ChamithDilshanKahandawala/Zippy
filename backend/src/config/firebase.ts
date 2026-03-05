import * as admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Initializes the Firebase Admin SDK once.
 * Uses environment variables for credentials so no service account JSON
 * file needs to be committed to the repository.
 */
const initFirebase = (): admin.app.App => {
  if (admin.apps.length > 0) {
    return admin.app(); // Return existing app if already initialized
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (
    !process.env.FIREBASE_PROJECT_ID ||
    !process.env.FIREBASE_CLIENT_EMAIL ||
    !privateKey
  ) {
    throw new Error(
      '🔴 Missing Firebase Admin credentials. ' +
        'Please copy .env.example to .env and fill in the values.',
    );
  }

  const app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
  });

  console.log('✅ Firebase Admin SDK initialized for project:', process.env.FIREBASE_PROJECT_ID);
  return app;
};

export const firebaseApp = initFirebase();
export const db = admin.firestore();
export const auth = admin.auth();
