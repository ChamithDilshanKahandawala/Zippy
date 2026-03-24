import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ProgressBarAndroid, ActivityIndicator } from 'react-native';
import { Feather, FontAwesome } from '@expo/vector-icons';
import { Ride } from '../../types/ride';
import { rateRide } from '../../services/api';
import { auth } from '../../config/firebase';

interface PaymentSummaryViewProps {
  ride: Ride;
  onClose: () => void;
}

export const PaymentSummaryView = ({ ride, onClose }: PaymentSummaryViewProps) => { // Removed React.FC for now
  const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(false);

  const handleSubmitRating = async () => {
    if (rating > 0 && ride.driverId) {
      setLoading(true);
      try {
        const token = await auth.currentUser?.getIdToken() || '';
        await rateRide(ride.id, ride.driverId, rating, true, token);
      } catch (e: any) {
        alert('Failed to submit rating: ' + (e.message || 'Unknown error'));
      }
    }
    onClose();
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-zippy-surface rounded-t-3xl p-6 pb-12 shadow-2xl items-center">
      <View className="mb-6 items-center">
        <View className="w-12 h-1 bg-zippy-border rounded-full mb-6" />
        <View className="w-16 h-16 bg-green-500/20 rounded-full items-center justify-center mb-4 border border-green-500/50">
          <Feather name="check" size={32} color="#4ADE80" />
        </View>
        <Text className="text-white text-2xl font-bold mb-2">You've Arrived!</Text>
        <Text className="text-gray-400 text-sm">Thank you for riding with Zippy</Text>
      </View>

      <Text className="text-zippy-accent text-lg font-bold mb-2">Total Fare</Text>
      <Text className="text-white text-5xl font-bold mb-8 tracking-tighter">LKR {ride.finalFare || ride.estimatedFare}</Text>


      <View className="w-full bg-zippy-bg/50 p-6 rounded-2xl border border-zippy-border mb-6">
        <Text className="text-gray-400 text-xs font-bold uppercase mb-4 text-center tracking-wider">How was your driver?</Text>
        <View className="flex-row justify-between px-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <TouchableOpacity key={star} onPress={() => setRating(star)}>
              <FontAwesome name={star <= rating ? "star" : "star-o"} size={32} color="#FBBF24" />
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <TouchableOpacity 
        onPress={handleSubmitRating}
        disabled={loading}
        className="w-full bg-zippy-accent py-4 rounded-xl items-center shadow-lg shadow-purple-900/40 opacity-90"
      >
        <Text className="text-white text-lg font-bold">{loading ? 'Submitting...' : 'Done'}</Text>
      </TouchableOpacity>
    </View>
  );
};
