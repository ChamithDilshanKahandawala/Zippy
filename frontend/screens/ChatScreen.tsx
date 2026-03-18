import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Linking,
  Alert
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc,
  doc,
  where,
  getDocs,
  writeBatch,
  getDoc
} from 'firebase/firestore';
import { db } from '../config/firebase'; // Adjust path if needed
import { useUser } from '../context/UserContext';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Define Route Params locally or import from types if available
type RootStackParamList = {
  Chat: { rideId: string; recipientName: string; recipientId: string; recipientPhone?: string };
};

type ChatScreenRouteProp = RouteProp<RootStackParamList, 'Chat'>;

interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: any; // Firestore Timestamp
  isRead: boolean;
}

export default function ChatScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const route = useRoute<ChatScreenRouteProp>();
  const { rideId, recipientName: initialName, recipientId } = route.params;
  const { user } = useUser();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [recipientPhone, setRecipientPhone] = useState<string | null>(route.params.recipientPhone || null);
  const [recipientName, setRecipientName] = useState(initialName);
  
  const flatListRef = useRef<FlatList>(null);

  // ─── Fetch Recipient Details ─────────────────────────────────────────────────
  useEffect(() => {
    const fetchRecipient = async () => {
      if (!recipientId) return;
      try {
        const userRef = doc(db, 'users', recipientId);
        const userDoc = await getDoc(userRef);
        if (userDoc.exists()) {
          const userData = userDoc.data();
          if (userData.phoneNumber) setRecipientPhone(userData.phoneNumber);
          if (userData.fullName) setRecipientName(userData.fullName);
        }
      } catch (err) {
        console.error("Error fetching recipient details:", err);
      }
    };
    fetchRecipient();
  }, [recipientId]);

  // ─── Listen for Messages ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!rideId) return;

    const messagesRef = collection(db, 'rides', rideId, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      const batch = writeBatch(db);
      let hasUnread = false;

      snapshot.docs.forEach((docSnap) => {
        const data = docSnap.data();
        const msg = { id: docSnap.id, ...data } as Message;
        msgs.push(msg);

        // Mark incoming messages as read if they are not from me
        if (user?.uid && msg.senderId !== user.uid && !msg.isRead) {
            const msgRef = doc(db, 'rides', rideId, 'messages', docSnap.id);
            batch.update(msgRef, { isRead: true });
            hasUnread = true;
        }
      });
      
      setMessages(msgs);
      setLoading(false);

      if (hasUnread) {
        batch.commit().catch(err => console.error("Error marking read:", err));
      }
    });

    return () => unsubscribe();
  }, [rideId, user?.uid]);

  // ─── Send Message ────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!inputText.trim() || !user?.uid) return;

    const text = inputText.trim();
    setInputText(''); // Clear input immediately for better UX

    try {
      const messagesRef = collection(db, 'rides', rideId, 'messages');
      await addDoc(messagesRef, {
        senderId: user.uid,
        text: text,
        createdAt: serverTimestamp(),
        isRead: false
      });
    } catch (error) {
      console.error("Error sending message:", error);
      Alert.alert("Error", "Failed to send message.");
      setInputText(text); // Restore text on fail
    }
  };

  // ─── Direct Call ─────────────────────────────────────────────────────────────
  const handleCall = () => {
    if (recipientPhone) {
      Linking.openURL(`tel:${recipientPhone}`);
    } else {
      Alert.alert("Error", "Phone number not available.");
    }
  };

  // ─── Render Item ─────────────────────────────────────────────────────────────
  const renderMessage = ({ item }: { item: Message }) => {
    const isMe = item.senderId === user?.uid;
    
    return (
      <View className={`flex-row ${isMe ? 'justify-end' : 'justify-start'} mb-3 mx-4`}>
        {!isMe && (
           <View className="w-8 h-8 rounded-full bg-zippy-surface-alt items-center justify-center mr-2 self-end mb-1">
             <Text className="text-gray-400 text-xs font-bold">{recipientName.charAt(0)}</Text>
           </View>
        )}
        
        <View 
          className={`px-4 py-3 rounded-2xl max-w-[75%] ${
            isMe 
              ? 'bg-zippy-accent rounded-br-none' 
              : 'bg-zippy-surface-alt rounded-bl-none border border-zippy-border'
          }`}
        >
          <Text className={`${isMe ? 'text-white' : 'text-gray-200'} text-base`}>
            {item.text}
          </Text>
          <Text className={`text-[10px] mt-1 self-end ${isMe ? 'text-purple-200' : 'text-gray-500'}`}>
            {item.createdAt?.seconds 
              ? new Date(item.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              : 'Just now'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-zippy-bg" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b border-zippy-border bg-zippy-surface shadow-sm z-10">
        <TouchableOpacity onPress={() => navigation.goBack()} className="mr-3 p-2">
          <Feather name="arrow-left" size={24} color="#E5E7EB" />
        </TouchableOpacity>
        
        <View className="flex-1">
          <Text className="text-white font-bold text-lg">{recipientName}</Text>
          <Text className="text-gray-400 text-xs">On Trip</Text>
        </View>

        <TouchableOpacity 
          onPress={handleCall}
          className="w-10 h-10 bg-green-500/10 rounded-full items-center justify-center border border-green-500/30"
        >
          <Feather name="phone" size={20} color="#4ADE80" />
        </TouchableOpacity>
      </View>

      {/* Messages List */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        className="flex-1"
      >
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#7C3AED" />
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            contentContainerStyle={{ paddingVertical: 16 }}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* Input Bar */}
        <View className="px-4 py-3 bg-zippy-surface border-t border-zippy-border flex-row items-center">
          <TextInput
            className="flex-1 bg-zippy-bg text-white px-4 py-3 rounded-xl border border-zippy-border mr-3 text-base max-h-24"
            placeholder="Type a message..."
            placeholderTextColor="#6B7280"
            value={inputText}
            onChangeText={setInputText}
            multiline
          />
          <TouchableOpacity 
            onPress={handleSend}
            disabled={!inputText.trim()}
            className={`w-12 h-12 rounded-full items-center justify-center ${
              !inputText.trim() ? 'bg-zippy-surface-alt' : 'bg-zippy-accent'
            }`}
          >
            <Ionicons name="send" size={20} color="white" style={{ marginLeft: 2 }} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
