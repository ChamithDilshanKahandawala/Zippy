import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';

import { useUser } from '../context/UserContext';
import NotificationHandler from '../components/NotificationHandler';

// ─── Screens ─────────────────────────────────────────────────────────────────
import RegisterScreen       from '../screens/RegisterScreen';
import SignInScreen         from '../screens/SignInScreen';
import PendingApprovalScreen from '../screens/PendingApprovalScreen';
import RiderHomeScreen      from '../screens/user/HomeScreen';
import DriverHomeScreen     from '../screens/driver/HomeScreen';
import AdminDashboardScreen from '../screens/admin/DashboardScreen';
import ProfileScreen        from '../screens/ProfileScreen';
import PaymentScreen        from '../screens/PaymentScreen';
import ChatScreen           from '../screens/ChatScreen';

// ─── Param lists ─────────────────────────────────────────────────────────────
type AuthStackParams = {
  SignIn: undefined;
  Register: undefined;
};
type AppStackParams = {
  PendingApproval: undefined;
  RiderHome: undefined;
  DriverHome: undefined;
  AdminDashboard: undefined;
  Profile: undefined;
  Payment: undefined;
  Chat: { rideId: string; recipientName: string; recipientId: string; recipientPhone?: string };
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

// ─── Unauthenticated stack ────────────────────────────────────────────────────
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

// ─── Authenticated stack — role + verification gated ─────────────────────────
function AppNavigator() {
  const { user } = useUser();

  return (
    <AppStack.Navigator screenOptions={{ headerShown: false }}>
      {/* ── Passenger ── */}
      {user?.role === 'user' && (
        <AppStack.Screen name="RiderHome" component={RiderHomeScreen} />
      )}

      {/* ── Driver: gate on isVerified ────────────────────────────────────────
            When isVerified is false (pending or rejected), show the holding screen.
            UserContext uses onSnapshot so this switches to DriverHome the instant
            the admin toggles isVerified → true — no restart needed.
      ────────────────────────────────────────────────────────────────────────── */}
      {user?.role === 'driver' && !user?.isVerified && (
        <AppStack.Screen name="PendingApproval" component={PendingApprovalScreen} />
      )}
      {user?.role === 'driver' && user?.isVerified && (
        <AppStack.Screen name="DriverHome" component={DriverHomeScreen} />
      )}

      {/* ── Admin ── */}
      {user?.role === 'admin' && (
        <AppStack.Screen name="AdminDashboard" component={AdminDashboardScreen} />
      )}

      {/* ── Shared screens (accessible from any role) ── */}
      <AppStack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ animation: 'slide_from_right' }}
      />
      <AppStack.Screen
        name="Payment"
        component={PaymentScreen}
        options={{ animation: 'slide_from_bottom', presentation: 'modal' }}
      />
      <AppStack.Screen
        name="Chat"
        component={ChatScreen}
        options={{ animation: 'slide_from_right' }}
      />
    </AppStack.Navigator>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function RootNavigator() {
  const { user, isLoading } = useUser();

  if (isLoading) return <LoadingScreen />;

  return (
    <NavigationContainer>
      {user ? (
        <>
          <AppNavigator />
          <NotificationHandler />
        </>
      ) : (
        <AuthNavigator />
      )}
    </NavigationContainer>
  );
}
