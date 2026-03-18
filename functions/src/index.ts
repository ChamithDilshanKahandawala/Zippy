import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin (only once)
if (admin.apps.length === 0) {
  admin.initializeApp();
}

// Export Triggers
export * from './triggers/rideTriggers';

// Optional: Export a test function
export const helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Zippy Cloud Functions!");
});
