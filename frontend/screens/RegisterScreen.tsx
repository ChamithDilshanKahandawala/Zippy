import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Animated,
  Alert,
  StyleSheet,
  TextInputProps,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { cssInterop } from 'nativewind';
import { registerUser } from '../services/api';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { UserRole } from '../types/api';

// Allow LinearGradient to accept NativeWind className
cssInterop(LinearGradient, { className: 'style' });

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLES: { value: UserRole; label: string; icon: string; subtitle: string }[] = [
  { value: 'user', label: 'User', icon: '🙋', subtitle: 'Book rides anywhere' },
  { value: 'driver', label: 'Driver', icon: '🚗', subtitle: 'Earn on your schedule' },
];

// ─── Role Card ────────────────────────────────────────────────────────────────
function RoleCard({
  item,
  selected,
  onPress,
}: {
  item: (typeof ROLES)[0];
  selected: boolean;
  onPress: () => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.spring(scale, { toValue: 0.94, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.85} className="flex-1">
      {/* Animated.View must NOT have className — NativeWind's JSX transform
          conflicts with Animated.Value in New Architecture (JSI boolean type error) */}
      <Animated.View
        style={[
          styles.roleCard,
          selected ? styles.roleCardSelected : styles.roleCardUnselected,
          { transform: [{ scale }] },
        ]}
      >
        <Text className="text-[28px]">{item.icon}</Text>
        <Text style={[styles.roleLabel, selected && styles.roleLabelSelected]}>
          {item.label}
        </Text>
        <Text className="text-[11px] text-zippy-dim text-center">{item.subtitle}</Text>
        {selected && (
          <View className="absolute top-2 right-2 w-[18px] h-[18px] rounded-full bg-zippy-accent items-center justify-center">
            <Text className="text-[10px] text-white font-black">✓</Text>
          </View>
        )}
      </Animated.View>
    </TouchableOpacity>
  );
}

// ─── Form Field ───────────────────────────────────────────────────────────────
interface FieldProps extends TextInputProps {
  label: string;
  error?: string;
  touched?: boolean;
}

function Field({ label, error, touched, ...props }: FieldProps) {
  const [focused, setFocused] = useState(false);
  const showError = touched && !!error;

  return (
    <View className="mb-[14px]">
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

// ─── Password Strength ────────────────────────────────────────────────────────
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  const score = [/.{8,}/, /[A-Z]/, /[a-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((r) =>
    r.test(password),
  ).length;

  const color = score <= 1 ? '#EF4444' : score <= 3 ? '#F59E0B' : '#10B981';
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong', 'Very strong'][score];

  return (
    <View className="flex-row items-center gap-1 -mt-1.5 mb-[14px]">
      {[1, 2, 3, 4, 5].map((i) => (
        <View
          key={i}
          className="flex-1 h-[3px] rounded-sm"
          style={{ backgroundColor: i <= score ? color : '#2A2A40' }}
        />
      ))}
      <Text className="text-[11px] font-semibold ml-1" style={{ color }}>
        {label}
      </Text>
    </View>
  );
}

// ─── Validation ───────────────────────────────────────────────────────────────
const validate = (f: {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirm: string;
}) => ({
  fullName: f.fullName.trim().length < 2 ? 'Full name is required.' : '',
  email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email) ? 'Enter a valid email.' : '',
  phone: !/^\+?[0-9]{7,15}$/.test(f.phone.trim()) ? 'Enter a valid phone number.' : '',
  password:
    f.password.length < 8
      ? 'Password must be at least 8 characters.'
      : !/[A-Z]/.test(f.password)
      ? 'Include at least one uppercase letter.'
      : !/[0-9]/.test(f.password)
      ? 'Include at least one number.'
      : '',
  confirm: f.password !== f.confirm ? 'Passwords do not match.' : '',
});

// ─── Main Screen ──────────────────────────────────────────────────────────────
interface Props {
  onSuccess: () => void;
  onLoginPress: () => void;
}

export default function RegisterScreen({ onSuccess, onLoginPress }: Props) {
  const [role, setRole] = useState<UserRole>('user');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const errors = validate({ fullName, email, phone, password, confirm });
  const isValid = Object.values(errors).every((e) => !e);

  const touchAll = () =>
    setTouched({ fullName: true, email: true, phone: true, password: true, confirm: true });

  const handleRegister = async () => {
    touchAll();
    if (!isValid) return;
    setLoading(true);
    try {
      await registerUser({
        email: email.trim(),
        password,
        fullName: fullName.trim(),
        phoneNumber: phone.trim(),
        role,
      });
      await signInWithEmailAndPassword(auth, email.trim(), password);
      setDone(true);
      setTimeout(onSuccess, 1200);
    } catch (err: unknown) {
      Alert.alert('Registration Failed', err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <LinearGradient colors={['#07070F', '#0D0D1A']} className="flex-1">
        <ScrollView
          className="flex-1"
          contentContainerClassName="flex-grow px-[22px] pt-[60px] pb-10"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Header ── */}
          <View className="mb-7">
            <Text className="text-[22px] font-black text-zippy-accent-light mb-3">🚖 Zippy</Text>
            <Text className="text-[34px] font-black text-zippy-text tracking-tight mb-1.5">
              Create Account
            </Text>
            <Text className="text-[14px] text-zippy-muted leading-5">
              Join thousands of riders and drivers on the road.
            </Text>
          </View>

          {/* ── Role selector ── */}
          <Text className="text-[13px] font-semibold text-zippy-muted mb-2.5 uppercase tracking-[0.8px]">
            I am a…
          </Text>
          <View className="flex-row gap-3 mb-3">
            {ROLES.map((r) => (
              <RoleCard key={r.value} item={r} selected={role === r.value} onPress={() => setRole(r.value)} />
            ))}
          </View>
          {role === 'driver' && (
            <View className="bg-amber-950/40 rounded-xl border-l-[3px] border-zippy-warn px-3 py-2.5 mb-4">
              <Text className="text-[12px] text-zippy-warn leading-[18px]">
                🔍  Driver accounts require admin verification before going online.
              </Text>
            </View>
          )}

          {/* ── Form fields ── */}
          <Field
            label="Full Name"
            placeholder="Jane Smith"
            value={fullName}
            onChangeText={setFullName}
            onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
            error={errors.fullName}
            touched={touched.fullName}
            autoCapitalize="words"
          />
          <Field
            label="Email"
            placeholder="jane@example.com"
            value={email}
            onChangeText={(v) => setEmail(v.trim())}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={errors.email}
            touched={touched.email}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Field
            label="Phone Number"
            placeholder="+94 77 123 4567"
            value={phone}
            onChangeText={setPhone}
            onBlur={() => setTouched((t) => ({ ...t, phone: true }))}
            error={errors.phone}
            touched={touched.phone}
            keyboardType="phone-pad"
          />
          <Field
            label="Password"
            placeholder="Min 8 chars, 1 uppercase, 1 number"
            value={password}
            onChangeText={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={errors.password}
            touched={touched.password}
            secureTextEntry
          />
          <PasswordStrength password={password} />
          <Field
            label="Confirm Password"
            placeholder="Re-enter password"
            value={confirm}
            onChangeText={setConfirm}
            onBlur={() => setTouched((t) => ({ ...t, confirm: true }))}
            error={errors.confirm}
            touched={touched.confirm}
            secureTextEntry
          />

          {/* ── Submit button ── */}
          <TouchableOpacity
            className={`rounded-xl overflow-hidden mt-2 mb-5 ${(!isValid || loading) ? 'opacity-50' : ''}`}
            onPress={handleRegister}
            activeOpacity={0.85}
            disabled={loading || done}
          >
            <LinearGradient
              colors={done ? ['#10B981', '#059669'] : ['#7C3AED', '#6D28D9']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="py-4 items-center justify-center"
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : done ? (
                <Text className="text-base font-bold text-white tracking-wide">✓  Account Created!</Text>
              ) : (
                <Text className="text-base font-bold text-white tracking-wide">Create Account →</Text>
              )}
            </LinearGradient>
          </TouchableOpacity>

          {/* ── Login link ── */}
          <TouchableOpacity onPress={onLoginPress} className="items-center">
            <Text className="text-sm text-zippy-muted">
              Already have an account?{' '}
              <Text className="text-zippy-accent-light font-bold">Sign In</Text>
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

// StyleSheet ONLY for Animated.View — avoids NativeWind className + Animated.Value
// conflict in New Architecture (JSI TypeError: expected boolean, got string)
const styles = StyleSheet.create({
  roleCard: {
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  roleCardSelected: {
    backgroundColor: '#1a0d3d',  // violet-950
    borderColor: '#7C3AED',      // zippy-accent
  },
  roleCardUnselected: {
    backgroundColor: '#11111C',  // zippy-surface
    borderColor: '#2A2A40',      // zippy-border
  },
  roleLabel: {
    fontSize: 15,
    fontWeight: '700',
    color: '#94A3B8',            // zippy-muted
  },
  roleLabelSelected: {
    color: '#9F67FF',            // zippy-accent-light
  },
});
