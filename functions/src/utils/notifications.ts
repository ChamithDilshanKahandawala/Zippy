import * as admin from 'firebase-admin';
import { Expo, ExpoPushMessage } from 'expo-server-sdk';
import * as functions from 'firebase-functions';

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const expo = new Expo();

export const sendPushNotification = async (
  userId: string,
  title: string,
  body: string,
  data: Record<string, any> = {}
) => {
  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      functions.logger.warn(`User ${userId} not found, skipping notification.`);
      return;
    }

    const userData = userDoc.data();
    const pushToken = userData?.pushToken;

    if (!pushToken || !Expo.isExpoPushToken(pushToken)) {
      functions.logger.warn(`Push token for user ${userId} is invalid: ${pushToken}`);
      return;
    }

    const messages: ExpoPushMessage[] = [{
      to: pushToken,
      sound: 'default',
      title: title,
      body: body,
      data: data,
      badge: 1, 
      _displayInForeground: true,
    }];

    const chunks = expo.chunkPushNotifications(messages);
    
    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        functions.logger.info(`Notification sent to ${userId}`, ticketChunk);
      } catch (error) {
        functions.logger.error('Error sending chunk:', error);
      }
    }
  } catch (error) {
    functions.logger.error('Error in sendPushNotification:', error);
  }
};
