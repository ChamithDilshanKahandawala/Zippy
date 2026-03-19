import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { StatsCard } from '../components/StatsCard';
import { Users, Car, MapPinned, DollarSign, Clock } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, Tooltip } from 'recharts';

interface EarningsPoint { day: string; amount: number; }

export const OverviewPage: React.FC = () => {
  const [onlineDrivers, setOnlineDrivers]   = useState(0);
  const [activeRides, setActiveRides]       = useState(0);
  const [totalRiders, setTotalRiders]       = useState(0);
  const [pendingRiders, setPendingRiders]   = useState(0);
  const [earnings] = useState<EarningsPoint[]>([
    { day: 'Mon', amount: 12000 },
    { day: 'Tue', amount: 14500 },
    { day: 'Wed', amount: 9800  },
    { day: 'Thu', amount: 16300 },
    { day: 'Fri', amount: 22100 },
    { day: 'Sat', amount: 18750 },
    { day: 'Sun', amount: 15420 },
  ]);

  useEffect(() => {
    const unsubDrivers = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'driver'), where('isOnline', '==', true)),
      (snap) => setOnlineDrivers(snap.size),
    );
    const unsubRiders = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'user')),
      (snap) => setTotalRiders(snap.size),
    );
    const unsubRides = onSnapshot(
      query(collection(db, 'rides'), where('status', 'in', ['PENDING', 'ACCEPTED', 'ONGOING'])),
      (snap) => setActiveRides(snap.size),
    );
    const unsubPending = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'driver'), where('isVerified', '==', false)),
      (snap) => setPendingRiders(snap.size),
    );

    return () => { unsubDrivers(); unsubRiders(); unsubRides(); unsubPending(); };
  }, []);

  const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Overview</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Live metrics across the Zippy platform.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        <StatsCard label="Online Drivers"    value={onlineDrivers}  icon={Car}       />
        <StatsCard label="Total Passengers"  value={totalRiders}    icon={Users}     />
        <StatsCard label="Active Rides"      value={activeRides}    icon={MapPinned} />
        <StatsCard label="Weekly Earnings"   value={`LKR ${totalEarnings.toLocaleString()}`} icon={DollarSign} />
        <StatsCard
          label="Pending Approvals"
          value={pendingRiders}
          icon={Clock}
          highlight={pendingRiders > 0}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm transition-colors duration-300">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">Earnings (Last 7 days)</h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">Sample data — plug in Firestore.</span>
        </div>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={earnings} margin={{ left: -20, right: 10 }}>
              <defs>
                <linearGradient id="earnings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0052FF" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0052FF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" stroke="#64748b" tickLine={false} axisLine={false} />
              <Tooltip
                cursor={{ stroke: '#1e293b', strokeWidth: 1 }}
                contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: 8 }}
              />
              <Area type="monotone" dataKey="amount" stroke="#0052FF" fill="url(#earnings)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};
