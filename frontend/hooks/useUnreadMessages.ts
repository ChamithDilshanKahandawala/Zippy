import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../config/firebase';
import { useUser } from '../context/UserContext';

export const useUnreadMessages = (rideId: string | null) => {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!rideId || !user?.uid) {
      setUnreadCount(0);
      return;
    }

    const messagesRef = collection(db, 'rides', rideId, 'messages');
    // Count messages where I am NOT the sender AND isRead is false
    const q = query(
      messagesRef,
      where('senderId', '!=', user.uid),
      where('isRead', '==', false)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadCount(snapshot.size);
    }, (err) => {
      console.error("Error fetching unread count:", err);
    });

    return () => unsubscribe();
  }, [rideId, user?.uid]);

  return unreadCount;
};
