import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { useUser } from '../context/UserContext';

// ─── Screens ─────────────────────────────────────────────────────────────────
import RegisterScreen from '../screens/RegisterScreen';
import SignInScreen   from '../screens/SignInScreen';
import RiderHomeScreen      from '../screens/rider/HomeScreen';
import DriverHomeScreen     from '../screens/driver/HomeScreen';
import AdminDashboardScreen from '../screens/admin/DashboardScreen';

// ─── Param lists ─────────────────────────────────────────────────────────────
type AuthStackParams = {
  SignIn: undefined;
  Register: undefined;
};
type AppStackParams = {
  RiderHome: undefined;
  DriverHome: undefined;
  AdminDashboard: undefined;
};

const AuthStack = createNativeStackNavigator<AuthStackParams>();
const AppStack  = createNativeStackNavigator<AppStackParams>();

// ─── Loading splash ───────────────────────────────────────────────────────────
function LoadingScreen() {
  return (
    <View className="flex-1 bg-zippy-bg items-center justify-center">
      <ActivityIndicator size="large" color="#7C3AED" />
    </View>
  );
}

// ─── Unauthenticated stack ─────────────────────────────────────────────────────
// Default screen: SignIn  |  Register reachable via "Create one" link
function AuthNavigator() {
  return (
    <AuthStack.Navigator
      initialRouteName="SignIn"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <AuthStack.Screen name="SignIn">
        {({ navigation }) => (
          <SignInScreen
            onRegisterPress={() => navigation.navigate('Register')}
          />
        )}
      </AuthStack.Screen>

      <AuthStack.Screen name="Register">
        {({ navigation }) => (
          <RegisterScreen
            onSuccess={() => { /* UserContext auth listener handles redirect */ }}
            onLoginPress={() => navigation.navigate('SignIn')}
          />
        )}
      </AuthStack.Screen>
    </AuthStack.Navigator>
  );
}

// ─── Authenticated stack — role gated ────────────────────────────────────────
// RootNavigator only renders AppNavigator when user is set, so role is always defined here.
function AppNavigator() {
  const { user } = useUser();

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {user?.role === 'user' && (
        <AppStack.Screen name="RiderHome" component={RiderHomeScreen} />
      )}
      {user?.role === 'driver' && (
        <AppStack.Screen name="DriverHome" component={DriverHomeScreen} />
      )}
      {user?.role === 'admin' && (
        <AppStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      )}
    </AppStack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user, isLoading } = useUser();

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      {user ? <AppNavigator /> : <AuthNavigator />}
    </NavigationContainer>
  );
}
