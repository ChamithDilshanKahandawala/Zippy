import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Passenger {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
}

export const RidersPage: React.FC = () => {
  const [riders, setRiders]   = useState<Passenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  const subscribe = () => {
    setError(null);
    setLoading(true);
    const q = query(collection(db, 'users'), where('role', '==', 'user'));
    return onSnapshot(
      q,
      (snap) => {
        setRiders(
          snap.docs.map((d) => {
            const data = d.data() as any;
            return {
              id: d.id,
              fullName: data.fullName ?? '',
              email: data.email ?? '',
              phoneNumber: data.phoneNumber ?? '',
            };
          }),
        );
        setLoading(false);
      },
      (err) => {
        console.error('[RidersPage] Firestore error:', err);
        setError(err.message);
        setLoading(false);
      },
    );
  };

  useEffect(() => {
    const unsub = subscribe();
    return () => unsub();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Passengers</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          All registered passenger accounts on the platform.
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-red-700 dark:text-red-400 text-sm">Failed to load passengers</p>
            <p className="text-xs text-red-600/80 dark:text-red-400/70 mt-1 font-mono">{error}</p>
          </div>
          <button
            onClick={() => { const u = subscribe(); return () => u(); }}
            className="flex items-center gap-1 text-xs text-red-600 dark:text-red-400 hover:underline"
          >
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
              <div className="h-3 w-40 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
              <div className="h-3 w-28 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      {!loading && !error && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm transition-colors duration-300">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
              <tr>
                {['Name', 'Email', 'Phone'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {riders.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-10 text-center text-sm italic text-slate-400 dark:text-slate-600">
                    No passengers registered yet.<br />
                    <span className="text-xs">Make sure users register with role <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">user</code> in the mobile app.</span>
                  </td>
                </tr>
              )}
              {riders.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{r.fullName}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.email}</td>
                  <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{r.phoneNumber}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
