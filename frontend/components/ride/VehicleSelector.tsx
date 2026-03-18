import React from 'react';
import { View, Text, TouchableOpacity, Image, ScrollView } from 'react-native';
import { MaterialCommunityIcons, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { PRICING_TIERS, VehicleType, calculateFare } from '../../utils/pricing';

interface VehicleSelectorProps {
  selectedType: VehicleType;
  onSelect: (type: VehicleType) => void;
  distanceKm: number;
  durationMin: number;
}

const VehicleIcon = ({ type, color }: { type: VehicleType; color: string }) => {
  switch (type) {
    case 'tuk':
      return <Text style={{ fontSize: 24 }}>🛺</Text>; // Using text emoji for now as placeholder
    case 'budget':
      return <Ionicons name="car" size={24} color={color} />;
    case 'luxury':
      return <MaterialCommunityIcons name="car-sports" size={24} color={color} />;
    default:
      return <Ionicons name="car" size={24} color={color} />;
  }
};

export const VehicleSelector = ({ 
  selectedType, 
  onSelect, 
  distanceKm,
  durationMin 
}: VehicleSelectorProps) => {
  
  return (
    <View className="bg-white border-t border-gray-200">
      <Text className="text-gray-500 font-bold px-5 pt-4 text-xs uppercase tracking-wider">
        Choose Your Ride
      </Text>
      
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 20, paddingVertical: 15 }}
      >
        {(Object.keys(PRICING_TIERS) as VehicleType[]).map((type) => {
          const tier = PRICING_TIERS[type];
          const isSelected = selectedType === type;
          const price = calculateFare(type, distanceKm);
          
          return (
            <TouchableOpacity
              key={type}
              onPress={() => onSelect(type)}
              activeOpacity={0.7}
              className={`
                mr-4 p-4 rounded-2xl w-36 border-2
                ${isSelected ? 'bg-indigo-50 border-indigo-600' : 'bg-white border-gray-200'}
              `}
            >
              <View className="flex-row justify-between items-start mb-2">
                <View className={`p-2 rounded-xl ${isSelected ? 'bg-indigo-100' : 'bg-gray-100'}`}>
                   <VehicleIcon type={type} color={isSelected ? '#4F46E5' : '#6B7280'} />
                </View>
                {isSelected && (
                  <View className="bg-indigo-600 rounded-full p-1">
                    <Ionicons name="checkmark" size={12} color="white" />
                  </View>
                )}
              </View>
              
              <Text className={`font-bold text-base mb-1 ${isSelected ? 'text-indigo-900' : 'text-gray-900'}`}>
                {tier.label}
              </Text>
              
              <View className="flex-row items-baseline space-x-1">
                <Text className={`text-lg font-bold ${isSelected ? 'text-indigo-600' : 'text-gray-900'}`}>
                  LKR {price}
                </Text>
              </View>
              
               <Text className={`text-xs mt-1 ${isSelected ? 'text-indigo-400' : 'text-gray-400'}`}>
                {tier.defaultEta} away
               </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};
