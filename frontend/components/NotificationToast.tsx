import React, { useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NotificationToastProps {
  visible: boolean;
  title: string;
  body: string;
  onPress?: () => void;
  onDismiss: () => void;
  bg?: string; // Optional background color
}

export const NotificationToast = ({ 
  visible, 
  title, 
  body, 
  onPress, 
  onDismiss,
  bg = 'bg-gray-900', // Default dark toast
}: NotificationToastProps) => {
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, {
        toValue: 20, // Just below status bar
        useNativeDriver: true,
      }).start();

      // Auto-hide after 4 seconds
      const timer = setTimeout(() => {
        handleDismiss();
      }, 4000);

      return () => clearTimeout(timer);
    } else {
      Animated.timing(slideAnim, {
        toValue: -150,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -150,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onDismiss());
  };

  if (!visible) return null;

  return (
    <Animated.View 
      style={[
        styles.toastContainer, 
        { transform: [{ translateY: slideAnim }] }
      ]}
      className={`absolute left-4 right-4 ${bg} border border-gray-700/50 rounded-2xl p-4 shadow-xl z-50`}
    >
      <TouchableOpacity 
        activeOpacity={0.9} 
        onPress={onPress}
        className="flex-row items-start"
      >
        <View className="w-10 h-10 rounded-full bg-zippy-accent/20 items-center justify-center mr-3 border border-zippy-accent/30">
          <Feather name="bell" size={20} color="#A78BFA" />
        </View>
        
        <View className="flex-1 mr-2">
          <Text className="text-white font-bold text-base mb-0.5">{title}</Text>
          <Text className="text-gray-400 text-xs leading-4" numberOfLines={2}>{body}</Text>
        </View>

        <TouchableOpacity 
          onPress={handleDismiss} 
          className="p-1 -mr-1"
        >
          <Feather name="x" size={18} color="#6B7280" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  }
});
