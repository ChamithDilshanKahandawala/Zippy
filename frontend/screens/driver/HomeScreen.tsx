import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch, StyleSheet, Image, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather, Ionicons } from '@expo/vector-icons';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useUser } from '../../context/UserContext';
import { startLocationTracking, stopLocationTracking } from '../../services/locationTask';
import { socketService } from '../../services/socket';
import { checkForActiveDriverRide } from '../../services/rideService';
import { useRideStatus } from '../../hooks/useRideStatus';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';
import { RideRequestModal } from './RideRequestModal';

// LinearGradient: use style prop directly — avoids cssInterop interference
// Switch: NativeWind wraps it via cssInterop which conflicts with its native boolean props

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const HEIGHTS = [60, 80, 45, 90, 70, 55, 100];

export default function DriverHomeScreen({ navigation }: any) {
  const { user } = useUser();
  const [isOnline, setIsOnline] = useState(false);
  const [activeRideId, setActiveRideId] = useState<string | null>(null);
  const { ride } = useRideStatus(activeRideId);
  const unreadCount = useUnreadMessages(activeRideId);

  useEffect(() => {
    const checkRide = async () => {
      if (user?.uid) {
        const id = await checkForActiveDriverRide(user.uid);
        if (id) setActiveRideId(id);
      }
    };
    checkRide();
    // Poll every 10s to be safe or rely on socket/notification
    const interval = setInterval(checkRide, 10000);
    return () => clearInterval(interval);
  }, [user]);

  const toggleOnline = async (value: boolean) => {
    setIsOnline(value);

    // Persist isOnline to Firestore so admin + passenger app can see
    if (user?.uid) {
      try {
        await setDoc(doc(db, 'users', user.uid), {
          isOnline: value,
          'riderDetails.isOnline': value,
        }, { merge: true });
      } catch (e) {
        console.error('❌ Failed to update isOnline:', e);
      }
    }

    if (value) {
      socketService.connect();
      await startLocationTracking(user?.uid || 'default-driver');
    } else {
      await stopLocationTracking();
    }
  };


  const handleChat = () => {
    if (ride && ride.riderId) {
       // Ideally fetch rider name properly, here assuming basic info
       navigation.navigate('Chat', {
         rideId: ride.id,
         recipientName: 'Rider', // TODO: Fetch Rider Name from User Collection if not in Ride Doc
         recipientId: ride.riderId,
         // recipientPhone: ride.rider.phoneNumber // if available
       });
    }
  };

  const handleCall = () => {
      // Logic to get rider phone would go here
      // For now, assume it's not available in this minimal implementation
  };

  return (
    <SafeAreaView className="flex-1 bg-zippy-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View className="flex-row justify-between items-center mb-4">
          <View>
            <Text className="text-[13px] text-zippy-muted">Ready to drive? 🚗</Text>
            <Text className="text-[22px] font-black text-zippy-text">{user?.fullName ?? 'Driver'}</Text>
          </View>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')} className="px-[14px] py-[7px] bg-zippy-card rounded-full">
            <Text className="text-[12px] text-zippy-muted font-semibold">Profile</Text>
          </TouchableOpacity>
        </View>

        {/* ── Active Ride Banner ── */}
        {ride && (
          <View className="bg-zippy-accent/10 border border-zippy-accent rounded-xl p-4 mb-6">
            <View className="flex-row justify-between items-center mb-2">
               <Text className="text-zippy-accent font-bold uppercase text-xs">Current Ride</Text>
               <Text className="text-white font-bold">{ride.status}</Text>
            </View>
            <Text className="text-white text-lg font-bold mb-4">Rider Waiting</Text>
            
            <View className="flex-row gap-3">
               <TouchableOpacity 
                 onPress={handleChat}
                 className="flex-1 bg-zippy-accent p-3 rounded-lg flex-row justify-center items-center relative"
               >
                 <Ionicons name="chatbubble-ellipses" size={18} color="white" style={{ marginRight: 8 }} />
                 <Text className="text-white font-bold">Chat</Text>
                 {unreadCount > 0 && (
                   <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border border-zippy-bg">
                     <Text className="text-white text-[10px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                   </View>
                 )}
               </TouchableOpacity>
               {/* Call Button (Disabled if no phone) */}
               {/* <TouchableOpacity className="bg-green-600 p-3 rounded-lg justify-center items-center">
                 <Feather name="phone" size={18} color="white" />
               </TouchableOpacity> */}
            </View>
          </View>
        )}

        {/* ── Verification banner ── */}
        {!user?.isVerified && (
          <View className="flex-row items-start gap-2.5 bg-amber-950/40 rounded-xl border-l-[3px] border-zippy-warn px-3 py-3 mb-4">
            <Text className="text-xl">⏳</Text>
            <View className="flex-1">
              <Text className="text-[13px] font-bold text-zippy-warn mb-0.5">Pending Verification</Text>
              <Text className="text-[12px] text-zippy-muted leading-[17px]">
                Your account is under review. You'll be notified once approved.
              </Text>
            </View>
          </View>
        )}

        {/* ── Go Online toggle — plain StyleSheet, no className on Switch ── */}
        <View
          style={[
            styles.onlineCard,
            isOnline ? styles.onlineCardActive : styles.onlineCardInactive,
          ]}
        >
          <View>
            <Text className="text-base font-bold text-zippy-text mb-1">
              {isOnline ? '🟢 You are Online' : '⚫ You are Offline'}
            </Text>
            <Text className="text-[12px] text-zippy-muted">
              {isOnline ? 'Waiting for ride requests…' : 'Toggle to start accepting rides'}
            </Text>
          </View>
          {/* Switch must NOT have className — NativeWind's cssInterop on Switch
              causes 'expected boolean, got string' in JSI/New Architecture */}
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            trackColor={{ false: '#2A2A40', true: '#10B981' }}
            thumbColor={isOnline ? '#ffffff' : '#94A3B8'}
            disabled={user?.isVerified !== true}
          />
        </View>

        {/* ── Today's stats ── */}
        <Text className="text-[13px] font-bold text-zippy-muted uppercase tracking-[0.8px] mb-3">
          Today's Summary
        </Text>
        <View className="flex-row gap-2.5 mb-6">
          {[
            { label: 'Earnings', value: 'Rs. 3,240', icon: '💰' },
            { label: 'Trips', value: '12', icon: '🛣️' },
            { label: 'Rating', value: '4.92 ⭐', icon: '⭐' },
          ].map((s) => (
            <View key={s.label} className="flex-1 bg-zippy-surface rounded-2xl p-[14px] items-center gap-1 border border-zippy-border">
              <Text className="text-xl">{s.icon}</Text>
              <Text className="text-[14px] font-black text-zippy-text">{s.value}</Text>
              <Text className="text-[11px] text-zippy-muted">{s.label}</Text>
            </View>
          ))}
        </View>

        {/* ── Weekly bar chart ── */}
        <Text className="text-[13px] font-bold text-zippy-muted uppercase tracking-[0.8px] mb-3">
          Weekly Earnings
        </Text>
        <View className="bg-zippy-surface rounded-2xl p-4 border border-zippy-border">
          <View className="flex-row items-end gap-1.5 h-[100px]">
            {HEIGHTS.map((h, i) => (
              <View key={i} className="flex-1 items-center gap-1 h-full justify-end">
                <LinearGradient
                  colors={['#7C3AED', '#4F46E5']}
                  style={[styles.bar, { height: `${h}%` as any }]}
                />
                <Text className="text-[10px] text-zippy-dim">{DAYS[i]}</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* ── Slide-up Ride Request Modal ── */}
      {isOnline && !activeRideId && (
        <RideRequestModal 
          onRideAccepted={(id) => {
            setActiveRideId(id);
            // Could navigate to a specific ride view if desired
          }} 
        />
      )}
    </SafeAreaView>
  );
}

// Minimal StyleSheet — only for components where NativeWind cssInterop causes issues
const styles = StyleSheet.create({
  onlineCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderRadius: 16,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
  },
  onlineCardActive: {
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderColor: '#10B981',
  },
  onlineCardInactive: {
    backgroundColor: '#11111C',
    borderColor: '#2A2A40',
  },
  bar: {
    width: '70%',
    borderRadius: 4,
  },
});
