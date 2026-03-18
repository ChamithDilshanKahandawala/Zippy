import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useUser } from '../context/UserContext';
import { initiatePayment, verifyPaymentWebhook } from '../services/api';

type RootStackParamList = {
  Profile: undefined;
};

export default function PaymentScreen() {
  const { user, firebaseUser } = useUser();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleTopUp = async () => {
    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      Alert.alert('Error', 'Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const token = await firebaseUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      // 1. Initiate Payment Intent
      const response = await initiatePayment(Number(amount), token);
      const { transactionId } = response.data;

      // 2. Simulate Payment Gateway success (Dev Only)
      // In production, this step happens on the server via webhook from Stripe/PayHere
      // For testing, we manually trigger the verification endpoint
      const verificationPayload = {
        userId: user?.uid,
        transactionId,
        amount: Number(amount),
        status: 'SUCCESS',
        signature: 'mock_signature', // Backend ignores this in dev mode
      };
      
      await verifyPaymentWebhook(verificationPayload);
      
      // No need to manually refresh; Firestore listener updates user automatically
      
      Alert.alert('Success', `Wallet topped up with ${amount} LKR!`, [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
      
    } catch (error: any) {
      console.error(error);
      Alert.alert('Payment Failed', error.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-white">
      <View className="px-6 py-4">
        {/* Header */}
        <View className="flex-row items-center mb-8">
          <TouchableOpacity onPress={() => navigation.goBack()} className="mr-4">
            <Text className="text-2xl text-gray-800">←</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-800">My Wallet</Text>
        </View>

        {/* Balance Card */}
        <View className="bg-purple-600 rounded-2xl p-6 mb-8 shadow-lg">
          <Text className="text-white text-opacity-80 text-sm mb-1">Current Balance</Text>
          <Text className="text-white text-3xl font-bold">
            LKR {user?.walletBalance?.toFixed(2) ?? '0.00'}
          </Text>
        </View>

        {/* Top Up Form */}
        <View>
          <Text className="text-gray-600 font-semibold mb-2">Top Up Amount (LKR)</Text>
          <TextInput
            className="border border-gray-200 rounded-xl p-4 text-lg font-semibold bg-gray-50 text-gray-800 mb-6"
            placeholder="0.00"
            keyboardType="numeric"
            value={amount}
            onChangeText={setAmount}
          />

          <TouchableOpacity
            onPress={handleTopUp}
            disabled={loading}
            className={`w-full py-4 rounded-xl items-center shadow-sm ${
              loading ? 'bg-gray-300' : 'bg-black'
            }`}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white font-bold text-lg">Top Up Now</Text>
            )}
          </TouchableOpacity>
        </View>
        
        {/* Helper Text */}
        <Text className="text-center text-gray-400 text-xs mt-6">
          Payments are secured by PayHere/Stripe (Mock Mode)
        </Text>
      </View>
    </SafeAreaView>
  );
}
