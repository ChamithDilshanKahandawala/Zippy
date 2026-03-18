import React from 'react';
import { X } from 'lucide-react';

interface DriverDetailsModalProps {
  open: boolean;
  onClose: () => void;
  driver: {
    fullName: string;
    email: string;
    phoneNumber: string;
    vehicleModel?: string;
    vehicleNumber?: string;
    isVerified: boolean;
  } | null;
}

export const DriverDetailsModal: React.FC<DriverDetailsModalProps> = ({ open, onClose, driver }) => {
  if (!open || !driver) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-900 shadow-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-slate-50">Driver Details</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-800">
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="space-y-2 text-sm">
          <div>
            <p className="text-slate-400 text-xs uppercase">Name</p>
            <p className="text-slate-100 font-medium">{driver.fullName}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase">Email</p>
            <p className="text-slate-100">{driver.email}</p>
          </div>
          <div>
            <p className="text-slate-400 text-xs uppercase">Phone</p>
            <p className="text-slate-100">{driver.phoneNumber}</p>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <p className="text-slate-400 text-xs uppercase">Vehicle</p>
              <p className="text-slate-100">{driver.vehicleModel || '—'}</p>
            </div>
            <div>
              <p className="text-slate-400 text-xs uppercase">Plate</p>
              <p className="text-slate-100">{driver.vehicleNumber || '—'}</p>
            </div>
          </div>
          <div className="mt-3">
            <p className="text-slate-400 text-xs uppercase">Status</p>
            <p className={driver.isVerified ? 'text-emerald-400' : 'text-amber-400'}>
              {driver.isVerified ? 'Verified' : 'Pending Verification'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
