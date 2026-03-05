import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useUser } from '../../context/UserContext';
import { getAdminStats } from '../../services/api';

interface Stats {
  totalUsers: number;
  riders: number;
  drivers: number;
  admins: number;
  generatedAt: string;
}

const STAT_CARDS = (stats: Stats) => [
  { label: 'Total Users', value: stats.totalUsers, icon: '👥', accent: 'text-zippy-accent', border: 'border-t-zippy-accent' },
  { label: 'Riders',      value: stats.riders,     icon: '🙋', accent: 'text-zippy-success', border: 'border-t-zippy-success' },
  { label: 'Drivers',     value: stats.drivers,    icon: '🚗', accent: 'text-zippy-warn',    border: 'border-t-zippy-warn' },
  { label: 'Admins',      value: stats.admins,     icon: '🛡️', accent: 'text-zippy-error',   border: 'border-t-zippy-error' },
];

export default function AdminDashboardScreen() {
  const { user, firebaseUser, logout } = useUser();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!firebaseUser) return;
      try {
        const token = await firebaseUser.getIdToken();
        const res = (await getAdminStats(token)) as { success: boolean; stats: Stats };
        setStats(res.stats);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load stats.');
      } finally {
        setLoading(false);
      }
    })();
  }, [firebaseUser]);

  return (
    <SafeAreaView className="flex-1 bg-zippy-bg">
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-5 pt-4 pb-10"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View className="flex-row justify-between items-center mb-6">
          <View>
            <Text className="text-[12px] font-bold text-zippy-accent mb-1">🛡️  Admin Portal</Text>
            <Text className="text-[22px] font-black text-zippy-text">{user?.fullName ?? 'Admin'}</Text>
          </View>
          <TouchableOpacity
            onPress={logout}
            className="px-[14px] py-[7px] bg-zippy-card rounded-full"
          >
            <Text className="text-[12px] text-zippy-muted font-semibold">Sign out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Stats ── */}
        <Text className="text-[13px] font-bold text-zippy-muted uppercase tracking-[0.8px] mb-3">
          Platform Stats
        </Text>

        {loading ? (
          <ActivityIndicator color="#7C3AED" className="mt-10" />
        ) : error ? (
          <View className="bg-red-950/40 rounded-xl border-l-[3px] border-zippy-error px-[14px] py-[14px] mb-5">
            <Text className="text-[13px] text-zippy-error">⚠️  {error}</Text>
          </View>
        ) : stats ? (
          <>
            <View className="flex-row flex-wrap gap-2.5 mb-2">
              {STAT_CARDS(stats).map((s) => (
                <View
                  key={s.label}
                  className={`w-[47%] bg-zippy-surface rounded-2xl p-4 items-center gap-1.5 border border-zippy-border border-t-[3px] ${s.border}`}
                >
                  <Text className="text-2xl">{s.icon}</Text>
                  <Text className={`text-[28px] font-black ${s.accent}`}>{s.value}</Text>
                  <Text className="text-[12px] text-zippy-muted">{s.label}</Text>
                </View>
              ))}
            </View>
            <Text className="text-[11px] text-zippy-muted text-center mb-6">
              Last updated: {new Date(stats.generatedAt).toLocaleTimeString()}
            </Text>
          </>
        ) : null}

        {/* ── Quick actions ── */}
        <Text className="text-[13px] font-bold text-zippy-muted uppercase tracking-[0.8px] mb-3">
          Quick Actions
        </Text>
        {[
          { label: 'Verify Pending Drivers', icon: '✅', count: 3 },
          { label: 'View Active Rides',       icon: '🛣️', count: 12 },
          { label: 'Manage Disputes',         icon: '⚖️', count: 1 },
        ].map((action) => (
          <TouchableOpacity
            key={action.label}
            className="flex-row items-center bg-zippy-surface rounded-2xl p-4 mb-2.5 gap-3 border border-zippy-border"
          >
            <Text className="text-xl">{action.icon}</Text>
            <Text className="flex-1 text-[14px] font-semibold text-zippy-text">{action.label}</Text>
            <View className="bg-zippy-accent rounded-[10px] px-2 py-0.5">
              <Text className="text-[12px] font-bold text-white">{action.count}</Text>
            </View>
            <Text className="text-[20px] text-zippy-muted">›</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
