import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';
import { Eye, ShieldCheck, Clock, ShieldX } from 'lucide-react';
import { RiderReviewModal } from './RiderReviewModal';
import type { Rider } from '../types/rider';

const StatusPill: React.FC<{ isVerified: boolean; rejectionReason?: string }> = ({ isVerified, rejectionReason }) => {
  if (isVerified) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
        <ShieldCheck className="w-3 h-3" /> Verified
      </span>
    );
  }
  if (rejectionReason) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30">
        <ShieldX className="w-3 h-3" /> Rejected
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30">
      <Clock className="w-3 h-3" /> Pending
    </span>
  );
};

export const DriverTable: React.FC = () => {
  const [drivers, setDrivers]         = useState<Rider[]>([]);
  const [selectedRider, setSelected]  = useState<Rider | null>(null);
  const [modalOpen, setModalOpen]     = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'driver'));
    const unsub = onSnapshot(q, (snap) => {
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
      setDrivers(list);
    });
    return () => unsub();
  }, []);

  const openModal = (rider: Rider) => { setSelected(rider); setModalOpen(true); };

  return (
    <>
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white dark:bg-slate-900/60 shadow-sm transition-colors duration-300">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/80 border-b border-slate-200 dark:border-slate-800">
            <tr>
              {['Name', 'Email', 'Phone', 'Vehicle', 'Status', ''].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {drivers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400 dark:text-slate-600 text-sm italic">
                  No riders registered yet.
                </td>
              </tr>
            )}
            {drivers.map((driver) => (
              <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors">
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{driver.fullName}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{driver.email}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{driver.phoneNumber}</td>
                <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                  {driver.riderDetails?.vehicleModel || '—'}
                </td>
                <td className="px-4 py-3">
                  <StatusPill
                    isVerified={driver.isVerified}
                    rejectionReason={driver.riderDetails?.rejectionReason}
                  />
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openModal(driver)}
                    className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    <Eye className="w-3 h-3" /> Review
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <RiderReviewModal open={modalOpen} onClose={() => setModalOpen(false)} rider={selectedRider} />
    </>
  );
};
