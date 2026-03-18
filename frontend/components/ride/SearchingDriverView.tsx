import React, { useEffect, useRef } from 'react';
import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Feather } from '@expo/vector-icons';

interface SearchingDriverViewProps {
  rideId: string;
  onCancel: () => void;
}

export const SearchingDriverView = ({ rideId, onCancel }: SearchingDriverViewProps) => { // Removed React.FC for now
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Cleanup on unmount implicitly handled by React
  }, []);

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-zippy-surface rounded-t-3xl p-6 pb-10 shadow-2xl items-center">
      <View className="w-12 h-1 bg-zippy-border rounded-full mb-6" />
      
      <Animated.View style={{ transform: [{ scale: pulseAnim }], marginBottom: 16 }}>
        <View className="w-20 h-20 rounded-full bg-zippy-accent/20 items-center justify-center border-2 border-zippy-accent">
           <Feather name="search" size={32} color="#7C3AED" />
        </View>
      </Animated.View>

      <Text className="text-white text-xl font-bold text-center mb-2">Finding nearby drivers...</Text>
      <Text className="text-gray-400 text-sm text-center mb-6">Connecting you with the best Zippy partner.</Text>

      <TouchableOpacity 
        onPress={onCancel}
        className="w-full bg-zippy-border py-4 rounded-xl items-center flex-row justify-center"
      >
        <Feather name="x" size={18} color="white" style={{ marginRight: 8 }} />
        <Text className="text-white font-semibold">Cancel Request</Text>
      </TouchableOpacity>
    </View>
  );
};
