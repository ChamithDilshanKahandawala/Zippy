import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';

// ─── Field ────────────────────────────────────────────────────────────────────
function Field({
  label,
  error,
  touched,
  ...props
}: {
  label: string;
  error?: string;
  touched?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  const [focused, setFocused] = useState(false);
  const showError = touched && !!error;

  return (
    <View className="mb-4">
      <Text className="text-[12px] font-semibold text-zippy-muted mb-1.5 uppercase tracking-[0.5px]">
        {label}
      </Text>
      <TextInput
        className={`bg-zippy-surface rounded-xl border px-[14px] py-[14px] text-[15px] text-zippy-text ${focused ? 'border-zippy-accent' : showError ? 'border-zippy-error' : 'border-zippy-border'}`}
        placeholderTextColor="#475569"
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        {...props}
      />
      {showError && (
        <Text className="text-[11px] text-zippy-error mt-1">{error}</Text>
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface Props {
  onRegisterPress: () => void;
}

export default function SignInScreen({ onRegisterPress }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);

  const emailError = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Enter a valid email.' : '';
  const passwordError = password.length < 6 ? 'Password must be at least 6 characters.' : '';
  const isValid = !emailError && !passwordError;

  const handleSignIn = async () => {
    setTouched({ email: true, password: true });
    // Don't early-return on client validation — always call Firebase
    // so the user gets a real error message, not a silent no-op
    if (!email.trim()) {
      Alert.alert('Sign In Failed', 'Please enter your email.');
      return;
    }
    if (!password) {
      Alert.alert('Sign In Failed', 'Please enter your password.');
      return;
    }

    setLoading(true);
    try {
      // Firebase signs in — onAuthStateChanged in UserContext fires automatically,
      // fetches the Firestore role, and RootNavigator redirects to the correct screen.
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const message =
        code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential'
          ? 'Incorrect email or password.'
          : code === 'auth/too-many-requests'
          ? 'Too many attempts. Please try again later.'
          : 'Sign in failed. Please try again.';
      Alert.alert('Sign In Failed', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#07070F', '#0D0D1A']} style={styles.gradient}>
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-[22px] pt-[60px] pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View className="mb-10">
            <Text className="text-[22px] font-black text-zippy-accent-light mb-3">🚖 Zippy</Text>
            <Text className="text-[34px] font-black text-zippy-text tracking-tight mb-1.5">
              Welcome back
            </Text>
            <Text className="text-[14px] text-zippy-muted leading-5">
              Sign in to continue your journey.
            </Text>
          </View>

          {/* ── Form ── */}
          <Field
            label="Email"
            placeholder="jane@example.com"
            value={email}
            onChangeText={(v) => setEmail(v.trim())}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
            touched={touched.email}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Field
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            touched={touched.password}
            secureTextEntry
          />

          {/* ── Forgot password ── */}
          <TouchableOpacity className="items-end mb-6 -mt-1">
            <Text className="text-[13px] text-zippy-accent-light font-semibold">
              Forgot password?
            </Text>
          </TouchableOpacity>

          {/* ── Sign In button ── */}
          <TouchableOpacity
            className={`rounded-xl overflow-hidden mb-5 ${loading ? 'opacity-50' : ''}`}
            onPress={handleSignIn}
            activeOpacity={0.85}
            disabled={loading}
          >
            <LinearGradient
              colors={['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.btnGradient}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text className="text-base font-bold text-white tracking-wide">Sign In →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Divider ── */}
          <View className="flex-row items-center gap-3 mb-5">
            <View className="flex-1 h-px bg-zippy-border" />
            <Text className="text-[12px] text-zippy-dim">or</Text>
            <View className="flex-1 h-px bg-zippy-border" />
          </View>

          {/* ── Register link ── */}
          <TouchableOpacity onPress={onRegisterPress} className="items-center">
            <Text className="text-sm text-zippy-muted">
              Don't have an account?{' '}
              <Text className="text-zippy-accent-light font-bold">Create one</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  btnGradient: { paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
});
