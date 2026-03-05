import './global.css';
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { UserProvider } from './context/UserContext';
import RootNavigator from './navigation';

export default function App() {
  return (
    <SafeAreaProvider>
      <UserProvider>
        <StatusBar style="light" backgroundColor="#07070F" />
        <RootNavigator />
      </UserProvider>
    </SafeAreaProvider>
  );
}
