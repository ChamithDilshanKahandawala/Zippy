import React from 'react';
import { View, Text, Image, TouchableOpacity, Linking, Platform } from 'react-native';
import { Feather, FontAwesome, Ionicons } from '@expo/vector-icons';
import { DriverInfo } from '../../types/ride';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

interface DriverAssignedViewProps {
  rideId: string;
  driver: DriverInfo;
  estimatedTime: string; // "5 mins"
  onCancel: () => void;
}

export const DriverAssignedView = ({ rideId, driver, estimatedTime, onCancel }: DriverAssignedViewProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const unreadCount = useUnreadMessages(rideId);

  const handleCall = () => {
    Linking.openURL(`tel:${driver.phoneNumber}`);
  };

  const handleChat = () => {
    navigation.navigate('Chat', { 
      rideId, 
      recipientName: driver.fullName, 
      recipientId: driver.uid,
      recipientPhone: driver.phoneNumber 
    });
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-zippy-surface rounded-t-3xl p-6 pb-8 shadow-2xl">
      <View className="items-center mb-4">
        <View className="w-12 h-1 bg-zippy-border rounded-full" />
        <Text className="text-zippy-success font-bold mt-4 uppercase text-xs tracking-wider">Driver is on the way</Text>
        <Text className="text-white text-2xl font-bold mt-1">{estimatedTime}</Text>
      </View>

      <View className="flex-row items-center bg-zippy-bg/50 p-4 rounded-xl border border-zippy-border mb-6">
        <View className="relative mr-4">
           {driver.profilePicUrl ? (
             <Image source={{ uri: driver.profilePicUrl }} className="w-16 h-16 rounded-full border-2 border-zippy-accent" />
           ) : (
             <View className="w-16 h-16 rounded-full bg-zippy-surface-alt items-center justify-center border-2 border-zippy-accent">
               <Feather name="user" size={24} color="#A78BFA" />
             </View>
           )}
           <View className="absolute -bottom-1 -right-1 bg-white rounded-full px-1.5 py-0.5 flex-row items-center border border-gray-200">
             <FontAwesome name="star" size={10} color="#FBBF24" />
             <Text className="text-xs font-bold text-gray-800 ml-1">{driver.rating.toFixed(1)}</Text>
           </View>
        </View>

        <View className="flex-1">
          <Text className="text-white text-lg font-bold">{driver.fullName}</Text>
          <Text className="text-gray-400 text-sm">{driver.vehicleModel} • {driver.vehiclePlate}</Text>
        </View>

        <View className="flex-row gap-2">
          <TouchableOpacity onPress={handleChat} className="w-12 h-12 bg-zippy-accent/20 rounded-full items-center justify-center border border-zippy-accent/50 relative">
            <Ionicons name="chatbubble-ellipses" size={22} color="#A78BFA" />
            {unreadCount > 0 && (
              <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5 items-center justify-center border border-zippy-bg">
                <Text className="text-white text-[10px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={handleCall} className="w-12 h-12 bg-green-500/20 rounded-full items-center justify-center border border-green-500/50">
            <Feather name="phone" size={20} color="#4ADE80" />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={onCancel} className="self-center">
        <Text className="text-red-400 font-semibold text-sm">Cancel Ride</Text>
      </TouchableOpacity>
    </View>
  );
};
