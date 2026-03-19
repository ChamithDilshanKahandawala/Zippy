import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import {
  X, CheckCircle, XCircle, FileText, Car,
  User, Phone, Mail, ShieldCheck, ShieldX, Clock, ExternalLink
} from 'lucide-react';
import { db } from '../firebase';
import type { Rider } from '../types/rider';

interface RiderReviewModalProps {
  open: boolean;
  onClose: () => void;
  rider: Rider | null;
}

const VEHICLE_LABELS: Record<string, string> = {
  tuk: 'Tuk-Tuk',
  budget: 'Budget Car',
  luxury: 'Luxury Car',
};

const DocLink: React.FC<{ label: string; url?: string }> = ({ label, url }) => (
  <div className="flex items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
    <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
      <FileText className="w-4 h-4 text-slate-400 dark:text-slate-500 shrink-0" />
      {label}
    </div>
    {url ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-xs font-medium text-zippy-blue hover:text-zippy-blue-dark transition-colors"
      >
        View <ExternalLink className="w-3 h-3" />
      </a>
    ) : (
      <span className="text-xs text-slate-400 dark:text-slate-600 italic">Not uploaded</span>
    )}
  </div>
);

const InfoRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-start gap-3">
    <span className="mt-0.5 text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>
    <div>
      <p className="text-[10px] uppercase tracking-wide font-semibold text-slate-400 dark:text-slate-500">{label}</p>
      <p className="text-sm font-medium text-slate-800 dark:text-slate-200">{value || '—'}</p>
    </div>
  </div>
);

export const RiderReviewModal: React.FC<RiderReviewModalProps> = ({ open, onClose, rider }) => {
  const [loading, setLoading]       = useState<'approve' | 'reject' | null>(null);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectReason, setRejectReason]     = useState('');
  const [actionDone, setActionDone] = useState<'approved' | 'rejected' | null>(null);

  if (!open || !rider) return null;

  const rd = rider.riderDetails;

  const handleApprove = async () => {
    setLoading('approve');
    try {
      await updateDoc(doc(db, 'users', rider.id), {
        isVerified: true,
        'riderDetails.rejectionReason': '',
      });
      setActionDone('approved');
      setTimeout(() => { setActionDone(null); onClose(); }, 1200);
    } finally {
      setLoading(null);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) return;
    setLoading('reject');
    try {
      await updateDoc(doc(db, 'users', rider.id), {
        isVerified: false,
        'riderDetails.rejectionReason': rejectReason.trim(),
      });
      setActionDone('rejected');
      setTimeout(() => { setActionDone(null); setShowRejectForm(false); setRejectReason(''); onClose(); }, 1200);
    } finally {
      setLoading(null);
    }
  };

  const handleClose = () => {
    setShowRejectForm(false);
    setRejectReason('');
    setActionDone(null);
    onClose();
  };

  // Status meta
  const statusMeta = rider.isVerified
    ? { label: 'Verified', cls: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/30', Icon: ShieldCheck }
    : rd?.rejectionReason
      ? { label: 'Rejected', cls: 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30', Icon: ShieldX }
      : { label: 'Pending Review', cls: 'bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-500/30', Icon: Clock };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden transition-colors duration-300">

        {/* ── Header ─────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-zippy-blue/10 dark:bg-zippy-blue/20 flex items-center justify-center">
              <span className="text-sm font-bold text-zippy-blue">
                {(rider.fullName || 'R').charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{rider.fullName}</h2>
              <div className={`mt-0.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[11px] font-medium ${statusMeta.cls}`}>
                <statusMeta.Icon className="w-3 h-3" />
                {statusMeta.label}
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
            <X className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(100vh-200px)]">
          {/* ── Info Grid ───────────────────────────── */}
          <div className="px-6 py-4 grid grid-cols-2 gap-4 border-b border-slate-100 dark:border-slate-800">
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={rider.email} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="Phone" value={rider.phoneNumber} />
            <InfoRow icon={<Car className="w-4 h-4" />} label="Vehicle" value={rd?.vehicleModel || '—'} />
            <InfoRow icon={<User className="w-4 h-4" />} label="Plate" value={rd?.vehiclePlate || '—'} />
          </div>

          {/* Vehicle Type */}
          {rd?.vehicleType && (
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Vehicle Type</span>
              <span className="px-2.5 py-1 rounded-full bg-zippy-blue/10 dark:bg-zippy-blue/20 text-zippy-blue text-xs font-semibold">
                {VEHICLE_LABELS[rd.vehicleType] ?? rd.vehicleType}
              </span>
            </div>
          )}

          {/* ── Documents ───────────────────────────── */}
          <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">Uploaded Documents</p>
            <DocLink label="National ID / Passport" url={rd?.documents?.nicUrl} />
            <DocLink label="Driving License" url={rd?.documents?.licenseUrl} />
            <DocLink label="Vehicle Insurance" url={rd?.documents?.insuranceUrl} />
          </div>

          {/* ── Previous Rejection Reason ────────────── */}
          {rd?.rejectionReason && (
            <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-500 mb-1">Previous Rejection Reason</p>
              <p className="text-sm text-slate-700 dark:text-slate-300 bg-red-50 dark:bg-red-500/10 rounded-lg px-3 py-2 border border-red-200 dark:border-red-500/20">
                {rd.rejectionReason}
              </p>
            </div>
          )}

          {/* ── Reject Form ──────────────────────────── */}
          {showRejectForm && (
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 space-y-2">
              <label className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
                placeholder="e.g., Blurry license image. Please re-upload a clear photo."
                className="w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none transition-all"
              />
            </div>
          )}

          {/* ── Actions Footer ───────────────────────── */}
          {!rider.isVerified && (
            <div className="px-6 py-4 flex items-center gap-3">
              {/* Success flash */}
              {actionDone && (
                <div className={`flex-1 text-center text-sm font-medium py-2 rounded-xl ${actionDone === 'approved' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400'}`}>
                  {actionDone === 'approved' ? '✅ Rider approved!' : '❌ Rider rejected'}
                </div>
              )}

              {!actionDone && !showRejectForm && (
                <>
                  {/* Approve */}
                  <button
                    onClick={handleApprove}
                    disabled={loading !== null}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-sm font-semibold transition-all shadow-sm"
                  >
                    {loading === 'approve'
                      ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <CheckCircle className="w-4 h-4" />
                    }
                    Approve
                  </button>
                  {/* Reject trigger */}
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={loading !== null}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-300 dark:border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 disabled:opacity-60 text-sm font-semibold transition-all"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                </>
              )}

              {!actionDone && showRejectForm && (
                <>
                  <button
                    onClick={() => setShowRejectForm(false)}
                    className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-sm font-medium transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleReject}
                    disabled={loading !== null || !rejectReason.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold transition-all"
                  >
                    {loading === 'reject'
                      ? <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <XCircle className="w-4 h-4" />
                    }
                    Confirm Reject
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
