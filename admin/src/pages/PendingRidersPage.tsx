import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Clock, Eye, PartyPopper, AlertTriangle, RefreshCw } from 'lucide-react';
import { RiderReviewModal } from '../components/RiderReviewModal';
import type { Rider } from '../types/rider';

const timeAgo = (ts: any): string => {
  if (!ts?.toDate) return '—';
  const diff = (Date.now() - ts.toDate().getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const VEHICLE_LABELS: Record<string, string> = { tuk: 'Tuk-Tuk', budget: 'Budget', luxury: 'Luxury' };

export const PendingRidersPage: React.FC = () => {
  const [pending, setPending]       = useState<Rider[]>([]);
  const [selectedRider, setSelected] = useState<Rider | null>(null);
  const [modalOpen, setModalOpen]    = useState(false);
  const [error, setError]            = useState<string | null>(null);
  const [loading, setLoading]        = useState(true);

  useEffect(() => {
    setError(null);
    setLoading(true);

    const q = query(
      collection(db, 'users'),
      where('role', '==', 'driver'),
      where('isVerified', '==', false),
    );

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: Rider[] = snap.docs.map((d) => {
          const data = d.data() as any;
          return {
            id: d.id,
            fullName: data.fullName ?? '',
            email: data.email ?? '',
            phoneNumber: data.phoneNumber ?? '',
            isVerified: data.isVerified ?? false,
            createdAt: data.createdAt,
            riderDetails: data.riderDetails,
          };
        });
        setPending(list);
        setLoading(false);
        setError(null);
      },
      (err) => {
        // Firestore often throws here when a composite index is missing.
        // The error message contains a direct link to create the index in the Firebase console.
        console.error('[PendingRidersPage] Firestore error:', err);
        setLoading(false);

        if (err.message?.includes('index')) {
          // Extract the index creation URL from the error message if present
          const urlMatch = err.message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
          const indexUrl = urlMatch?.[0];
          setError(
            indexUrl
              ? `__INDEX__${indexUrl}`
              : 'A Firestore composite index is required for this query. Check your browser console for the index creation link.',
          );
        } else {
          setError(`Failed to load pending riders: ${err.message}`);
        }
      },
    );
    return () => unsub();
  }, []);

  const openModal = (rider: Rider) => { setSelected(rider); setModalOpen(true); };

  // ── Error state ─────────────────────────────────────────────────────────────
  if (error) {
    const isIndexError = error.startsWith('__INDEX__');
    const indexUrl     = isIndexError ? error.replace('__INDEX__', '') : null;

    return (
      <div className="space-y-5">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Pending Approvals</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">Riders awaiting document review and account verification.</p>
        </div>

        <div className="rounded-2xl border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-6 flex flex-col items-center gap-4 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500" />
          <div>
            <p className="font-semibold text-slate-900 dark:text-white mb-1">
              {isIndexError ? 'Firestore Composite Index Required' : 'Query Error'}
            </p>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md">
              {isIndexError
                ? 'This query needs a one-time composite index in Firestore. Click the button below to create it automatically (takes ~1 minute).'
                : error}
            </p>
          </div>
          {indexUrl ? (
            <a
              href={indexUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-semibold transition-all shadow-sm"
            >
              <RefreshCw className="w-4 h-4" />
              Create Firestore Index →
            </a>
          ) : (
            <button
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 hover:bg-slate-700 text-white text-sm font-semibold transition-all"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
          )}
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Also check the browser console for the full error and index link.
          </p>
        </div>
      </div>
    );
  }

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-5">
        <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 space-y-3">
              <div className="flex gap-3">
                <div className="h-10 w-10 rounded-full bg-slate-200 dark:bg-slate-800 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                  <div className="h-3 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                </div>
              </div>
              <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Main render ─────────────────────────────────────────────────────────────
  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Pending Approvals</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
            Riders awaiting document review and account verification.
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10">
          <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
          <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
            {pending.length} Pending
          </span>
        </div>
      </div>

      {/* Empty state */}
      {pending.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 py-16 flex flex-col items-center gap-3 text-center">
          <PartyPopper className="w-10 h-10 text-emerald-400" />
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200">All caught up!</p>
          <p className="text-sm text-slate-500 dark:text-slate-400">No riders pending review right now.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {pending.map((rider) => (
            <div
              key={rider.id}
              className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-4 shadow-sm hover:shadow-md hover:border-zippy-blue/40 transition-all duration-200"
            >
              {/* Amber dot indicator */}
              <span className="absolute top-4 right-4 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />

              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-zippy-blue/10 dark:bg-zippy-blue/20 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-zippy-blue">
                    {(rider.fullName || 'R').charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{rider.fullName}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{rider.email}</p>
                </div>
              </div>

              <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400 mb-4">
                <div className="flex justify-between">
                  <span>Phone</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{rider.phoneNumber || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Vehicle type</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {VEHICLE_LABELS[rider.riderDetails?.vehicleType ?? ''] ?? rider.riderDetails?.vehicleType ?? '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Submitted</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">{timeAgo(rider.createdAt)}</span>
                </div>
              </div>

              <button
                onClick={() => openModal(rider)}
                className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-zippy-blue hover:bg-zippy-blue-dark text-white text-xs font-semibold transition-all shadow-sm shadow-zippy-blue/30"
              >
                <Eye className="w-3.5 h-3.5" />
                Review Application
              </button>
            </div>
          ))}
        </div>
      )}

      <RiderReviewModal open={modalOpen} onClose={() => setModalOpen(false)} rider={selectedRider} />
    </div>
  );
};
