import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useUser } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';

// Configure how notifications behave when the app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // Show the alert (toast)
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const usePushNotifications = () => {
  const { user } = useUser();
  const navigation = useNavigation<any>();
  const [expoPushToken, setExpoPushToken] = useState<string | undefined>('');
  const [notification, setNotification] = useState<Notifications.Notification | undefined>(undefined);
  
  const notificationListener = useRef<Notifications.Subscription>();
  const responseListener = useRef<Notifications.Subscription>();

  const registerForPushNotificationsAsync = async () => {
    let token;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    if (Device.isDevice) {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        alert('Failed to get push token for push notification!');
        return;
      }
      
      // Learn more about projectId:
      // https://docs.expo.dev/push-notifications/push-notifications-setup/#configure-projectid
      // For now, assuming standard Expo setup or development build
      try {
        const projectId =
          Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        
        if (!projectId) {
           console.log('Project ID not found (Dev Mode) - skipping push token fetch');
        } else {
           token = (await Notifications.getExpoPushTokenAsync({
             projectId,
           })).data;
           console.log('Expo Push Token:', token);
        }
      } catch(e) {
        console.error('Error fetching token:', e);
      }
    } else {
      console.log('Must use physical device for Push Notifications');
    }

    return token;
  };

  const saveTokenToFirestore = async (token: string) => {
    if (!user?.uid) return;
    
    try {
      const userRef = doc(db, 'users', user.uid);
      // Optional: Check if token is different before writing to save writes
      // For now, just update (merge: true is default for updateDoc but we use updateDoc)
      await updateDoc(userRef, {
        pushToken: token
      });
    } catch (error) {
      console.error('Error saving push token to Firestore:', error);
    }
  };

  useEffect(() => {
    // 1. Register and Save Token
    if (user?.uid) {
      registerForPushNotificationsAsync().then(token => {
        setExpoPushToken(token);
        if (token) {
          saveTokenToFirestore(token);
        }
      });
    }

    // 2. Listen for Incoming Notifications (Foreground)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
      // You can trigger your custom Toast here if you want 
      // instead of the system alert (logic managed in App.tsx typically)
    });

    // 3. Listen for Interactions (User Tapped Notification)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      
      // Navigation Logic
      if (data?.rideId) {
        // Assuming typical navigation structure
        // You might need to dispatch a specific action or navigate to a specialized screen
        console.log('Navigating to ride:', data.rideId);
        // Example: navigation.navigate('RiderHome', { rideId: data.rideId });
        // Or if strictly for rider/driver split:
        if (user?.role === 'driver') {
             // navigation.navigate('DriverRide', { rideId: data.rideId });
        } else {
             // navigation.navigate('RiderHome', { rideId: data.rideId }); 
        }
      }
    });

    return () => {
      notificationListener.current && notificationListener.current.remove();
      responseListener.current && responseListener.current.remove();
    };
  }, [user?.uid]);

  return {
    expoPushToken,
    notification,
  };
};
