import React from 'react';
import { View, Text, TouchableOpacity, Linking, Image } from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { Ride } from '../../types/ride';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUnreadMessages } from '../../hooks/useUnreadMessages';

interface OngoingRideViewProps {
  ride: Ride;
}

export const OngoingRideView = ({ ride }: OngoingRideViewProps) => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const unreadCount = useUnreadMessages(ride.id);

  const handleCall = () => {
    if (ride.driver?.phoneNumber) {
      Linking.openURL(`tel:${ride.driver.phoneNumber}`);
    }
  };

  const handleChat = () => {
    if (ride.driver) {
      navigation.navigate('Chat', {
        rideId: ride.id,
        recipientName: ride.driver.fullName,
        recipientId: ride.driver.uid,
        recipientPhone: ride.driver.phoneNumber,
      });
    }
  };

  return (
    <View className="absolute bottom-0 left-0 right-0 bg-zippy-surface rounded-t-3xl p-6 pb-12 shadow-2xl">
      <View className="items-center mb-6">
        <View className="w-12 h-1 bg-zippy-border rounded-full" />
        <Text className="text-zippy-success font-bold mt-4 uppercase text-xs tracking-wider animate-pulse">Ride in Progress</Text>
      </View>
      
      {/* Driver Info & Actions */}
      <View className="flex-row items-center justify-between bg-zippy-bg/50 p-3 rounded-xl border border-zippy-border mb-6">
          <View className="flex-row items-center flex-1">
             {ride.driver?.profilePicUrl ? (
                <Image source={{ uri: ride.driver.profilePicUrl }} className="w-10 h-10 rounded-full mr-3" />
             ) : (
                <View className="w-10 h-10 rounded-full bg-zippy-surface-alt items-center justify-center mr-3">
                   <Feather name="user" size={18} color="#9CA3AF" />
                </View>
             )}
             <View>
                <Text className="text-white font-bold">{ride.driver?.fullName}</Text>
                <Text className="text-gray-400 text-xs">{ride.driver?.vehiclePlate}</Text>
             </View>
          </View>
          
          <View className="flex-row gap-2">
            <TouchableOpacity onPress={handleChat} className="w-10 h-10 bg-zippy-accent/20 rounded-full items-center justify-center border border-zippy-accent/50 relative">
               <Ionicons name="chatbubble-ellipses" size={20} color="#A78BFA" />
               {unreadCount > 0 && (
                <View className="absolute -top-1 -right-1 bg-red-500 rounded-full w-4 h-4 items-center justify-center border border-zippy-bg">
                  <Text className="text-white text-[9px] font-bold">{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
               )}
            </TouchableOpacity>
            <TouchableOpacity onPress={handleCall} className="w-10 h-10 bg-green-500/20 rounded-full items-center justify-center border border-green-500/50">
               <Feather name="phone" size={18} color="#4ADE80" />
            </TouchableOpacity>
          </View>
      </View>

      <View className="flex-row items-center justify-between mb-8 px-4">
        <View className="items-center flex-1">
          <Text className="text-gray-400 text-xs uppercase mb-1">Estimated Arrival</Text>
          <Text className="text-white text-3xl font-bold">12:45 PM</Text> 
        </View>
        <View className="w-px h-12 bg-zippy-border" />
        <View className="items-center flex-1">
          <Text className="text-gray-400 text-xs uppercase mb-1">Distance Left</Text>
          <Text className="text-white text-3xl font-bold">4.2 km</Text>
        </View>
      </View>

      <View className="bg-zippy-bg/50 p-4 rounded-xl border border-zippy-border flex-row items-center">
        <View className="w-10 h-10 rounded-full bg-zippy-accent/20 items-center justify-center mr-4">
          <Feather name="map-pin" size={20} color="#A78BFA" />
        </View>
        <View className="flex-1">
          <Text className="text-gray-400 text-xs uppercase mb-0.5">Destination</Text>
          <Text className="text-white font-medium text-sm" numberOfLines={1}>{ride.destination.address || 'Unknown Destination'}</Text>
        </View>
      </View>
    </View>
  );
};
