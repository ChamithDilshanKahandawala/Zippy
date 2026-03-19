import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';

// Initialize Expo SDK
const expo = new Expo();

/**
 * Send a push notification to a specific user
 * @param userId - Firebase Auth UID of the recipient
 * @param title - Notification Title
 * @param body - Notification Body
 * @param data - Custom data payload (e.g. { rideId: '123' })
 */
export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) => {
  try {
    // 1. Fetch user's push token from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      console.log(`User ${userId} not found, skipping notification.`);
      return;
    }

    const userData = userDoc.data();
    const pushToken = userData?.pushToken;

    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      console.error(`Push token ${pushToken} is not a valid Expo push token`);
      return;
    }

    // 2. Construct the message
    const messages: ExpoPushMessage[] = [{
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1, // Increment app badge
      // Note: _displayInForeground was removed in newer expo-server-sdk versions.
      // Foreground notification display is now handled client-side via
      // expo-notifications' setNotificationHandler in the mobile app.
    }];


    // 3. Send via Expo
    const chunks = expo.chunkPushNotifications(messages);
    
    const tickets = [];
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        tickets.push(...ticketChunk);
        console.log('Notification sent successfully:', ticketChunk);
      } catch (error) {
        console.error('Error sending chunk:', error);
      }
    }

    // Optional: Handle receipt errors if needed (e.g. invalid token clean up)
    
  } catch (error) {
    console.error('Error in sendPushNotification:', error);
  }
};

/**
 * Trigger: On Ride Status Changed
 * Call this function whenever you update a ride status in your backend API
 */
export const onRideStatusChange = async (rideId: string, newStatus: string, rideData: any) => {
  // Example Logic
  let title = '';
  let body = '';
  let recipientId = '';

  switch (newStatus) {
    case 'ACCEPTED':
      title = 'Ride Accepted! 🚗';
      body = `Driver ${rideData.driverName || 'Verified Driver'} is on the way.`;
      recipientId = rideData.riderId;
      break;
      
    case 'ARRIVED':
      title = 'Driver Arrived! 📍';
      body = 'Your ride is here. Please meet the driver.';
      recipientId = rideData.riderId;
      break;
      
    case 'STARTED':
      title = 'On the way! 🚀';
      body = 'Your trip to the destination has started.';
      recipientId = rideData.riderId;
      break;
      
    case 'COMPLETED':
      title = 'You arrived! 🎉';
      body = 'Hope you had a great trip. Please rate your driver.';
      recipientId = rideData.riderId;
      break;

    case 'CANCELLED':
      title = 'Ride Cancelled ❌';
      body = 'The ride was cancelled.';
      recipientId = rideData.riderId; // Or driverId depending on who cancelled
      break;

    default:
      return;
  }

  if (recipientId) {
    await sendPushNotification(recipientId, title, body, { rideId, status: newStatus });
  }
};
