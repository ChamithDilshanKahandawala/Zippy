import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Animated, Easing } from 'react-native';
import { BlurView } from 'expo-blur';
import { Feather, Ionicons } from '@expo/vector-icons';
import { socketService } from '../../services/socket';
import { acceptRideRequest, declineRideRequest } from '../../services/api';
import { useUser } from '../../context/UserContext';
import { DRIVER_RESPONSE_TIMEOUT_MS } from '../../../shared/rideConstants';

const { width, height } = Dimensions.get('window');

interface RideOffer {
  rideId: string;
  origin: { latitude: number; longitude: number; address: string };
  destination: { latitude: number; longitude: number; address: string };
  estimatedFare: number;
  rideType: string;
  timeoutMs: number;
}

interface RideRequestModalProps {
  onRideAccepted: (rideId: string) => void;
}

export const RideRequestModal: React.FC<RideRequestModalProps> = ({ onRideAccepted }) => {
  const { user, firebaseUser } = useUser();
  const [offer, setOffer] = useState<RideOffer | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);

  // Animations
  const slideAnim = React.useRef(new Animated.Value(height)).current;
  const progressAnim = React.useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!user?.uid) return;

    const socket = socketService.connect();
    
    // Join a personal driver room to receive offers from backend
    socket.emit('join_trip', `driver_${user.uid}`);

    // Listen for incoming ride requests
    socket.on('ride_request', (data: RideOffer) => {
      setOffer(data);
      setTimeLeft(data.timeoutMs / 1000);
      setLoading(false);

      // Slide up animation
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        bounciness: 4,
        speed: 12,
      }).start();

      // Progress bar animation
      progressAnim.setValue(1);
      Animated.timing(progressAnim, {
        toValue: 0,
        duration: data.timeoutMs,
        easing: Easing.linear,
        useNativeDriver: false,
      }).start();
    });

    // Listen for missed/expired offers
    socket.on('ride_request_expired', (data: { rideId: string }) => {
      if (offer?.rideId === data.rideId) {
        closeModal();
      }
    });

    return () => {
      socket.off('ride_request');
      socket.off('ride_request_expired');
    };
  }, [user?.uid, offer?.rideId]);

  // Countdown timer
  useEffect(() => {
    if (!offer || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          closeModal();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [offer, timeLeft]);

  const closeModal = () => {
    Animated.timing(slideAnim, {
      toValue: height,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setOffer(null);
      setLoading(false);
    });
  };

  const handleAccept = async () => {
    if (!offer || !user?.uid || !firebaseUser) return;
    setLoading(true);

    try {
      const token = await firebaseUser.getIdToken();
      await acceptRideRequest(offer.rideId, user.uid, token);
      
      // Stop the timer and close modal
      closeModal();
      onRideAccepted(offer.rideId);

    } catch (error: any) {
      console.error('Accept error:', error.message);
      alert('Failed to accept ride: ' + error.message);
      closeModal(); // Could have been accepted by someone else
    }
  };

  const handleDecline = async () => {
    if (!offer || !user?.uid || !firebaseUser) return;
    setLoading(true);

    try {
      const token = await firebaseUser.getIdToken();
      // We don't await this, just send it and close immediately 
      declineRideRequest(offer.rideId, user.uid, token).catch(console.error);
    } finally {
      closeModal();
    }
  };

  if (!offer) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <BlurView intensity={40} tint="dark" style={StyleSheet.absoluteFill} />
      
      <Animated.View 
        style={[
          styles.modalContainer, 
          { transform: [{ translateY: slideAnim }] }
        ]}
      >
        <View style={styles.content}>
          <Text style={styles.title}>New Ride Request</Text>
          
          <View style={styles.etaContainer}>
            <View style={styles.etaCircle}>
              <Text style={styles.etaText}>{timeLeft}s</Text>
            </View>
            <Animated.View style={[styles.progressBar, {
               width: progressAnim.interpolate({
                 inputRange: [0, 1],
                 outputRange: ['0%', '100%'],
               }),
               backgroundColor: progressAnim.interpolate({
                 inputRange: [0, 0.3, 1],
                 outputRange: ['#EF4444', '#F59E0B', '#10B981'],
               })
            }]} />
          </View>

          <View style={styles.priceContainer}>
            <Text style={styles.priceLabel}>Estimated Earnings</Text>
            <Text style={styles.price}>LKR {offer.estimatedFare.toFixed(2)}</Text>
          </View>

          <View style={styles.routeContainer}>
            <View style={styles.locationRow}>
               <View style={styles.dotOrigin} />
               <View style={styles.locationTextContainer}>
                 <Text style={styles.locationLabel}>Pickup</Text>
                 <Text style={styles.locationValue} numberOfLines={2}>
                   {offer.origin.address || 'Unknown Location'}
                 </Text>
               </View>
            </View>
            
            <View style={styles.routeLine} />
            
            <View style={styles.locationRow}>
               <View style={styles.dotDestination} />
               <View style={styles.locationTextContainer}>
                 <Text style={styles.locationLabel}>Drop-off</Text>
                 <Text style={styles.locationValue} numberOfLines={2}>
                   {offer.destination.address || 'Unknown Location'}
                 </Text>
               </View>
            </View>
          </View>

          <View style={styles.actions}>
            <TouchableOpacity 
              style={styles.declineBtn} 
              onPress={handleDecline}
              disabled={loading}
            >
              <Text style={styles.declineBtnText}>Decline</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.acceptBtn, loading && styles.acceptBtnDisabled]} 
              onPress={handleAccept}
              disabled={loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <Text style={styles.acceptBtnText}>Accepting...</Text>
              ) : (
                <Text style={styles.acceptBtnText}>Accept Ride</Text>
              )}
            </TouchableOpacity>
          </View>

        </View>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    backgroundColor: '#11111C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 20,
    paddingBottom: 40,
  },
  content: {
    padding: 24,
  },
  title: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 20,
  },
  etaContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  etaCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: '#2A2A40',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  etaText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    width: '100%',
  },
  priceContainer: {
    backgroundColor: '#191924',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  priceLabel: {
    color: '#94A3B8',
    fontSize: 13,
    marginBottom: 4,
  },
  price: {
    color: '#10B981',
    fontSize: 28,
    fontWeight: '900',
  },
  routeContainer: {
    backgroundColor: '#191924',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  locationTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  locationLabel: {
    color: '#94A3B8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  locationValue: {
    color: '#F8FAFC',
    fontSize: 15,
    marginTop: 2,
    fontWeight: '600',
  },
  dotOrigin: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#3B82F6',
    marginTop: 4,
  },
  dotDestination: {
    width: 12,
    height: 12,
    borderRadius: 0, // Square for dropoff
    backgroundColor: '#EF4444',
    marginTop: 4,
  },
  routeLine: {
    width: 2,
    height: 20,
    backgroundColor: '#2A2A40',
    marginLeft: 5,
    marginVertical: 4,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#191924',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  declineBtnText: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: 'bold',
  },
  acceptBtn: {
    flex: 2,
    backgroundColor: '#7C3AED',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  acceptBtnDisabled: {
    opacity: 0.7,
  },
  acceptBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
