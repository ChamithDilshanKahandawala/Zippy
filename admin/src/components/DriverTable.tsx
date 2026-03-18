import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Eye } from 'lucide-react';

interface Driver {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  isVerified: boolean;
  vehicleModel?: string;
  vehicleNumber?: string;
}

interface DriverTableProps {
  onSelect: (driver: Driver) => void;
}

export const DriverTable: React.FC<DriverTableProps> = ({ onSelect }) => {
  const [drivers, setDrivers] = useState<Driver[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'driver'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Driver[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        list.push({
          id: docSnap.id,
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber,
          isVerified: data.isVerified ?? false,
          vehicleModel: data.vehicleModel,
          vehicleNumber: data.vehicleNumber,
        });
      });
      setDrivers(list);
    });

    return () => unsub();
  }, []);

  const toggleVerification = async (driver: Driver) => {
    const ref = doc(db, 'users', driver.id);
    await updateDoc(ref, { isVerified: !driver.isVerified });
  };

  return (
    <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
      <table className="min-w-full text-sm">
        <thead className="bg-slate-900/80 border-b border-slate-800">
          <tr>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Name</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Email</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Phone</th>
            <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Status</th>
            <th className="px-4 py-2 text-right text-xs font-semibold text-slate-400">Actions</th>
          </tr>
        </thead>
        <tbody>
          {drivers.map((driver) => (
            <tr key={driver.id} className="border-t border-slate-800 hover:bg-slate-800/60">
              <td className="px-4 py-2 text-slate-100">{driver.fullName}</td>
              <td className="px-4 py-2 text-slate-300">{driver.email}</td>
              <td className="px-4 py-2 text-slate-300">{driver.phoneNumber}</td>
              <td className="px-4 py-2">
                <button
                  onClick={() => toggleVerification(driver)}
                  className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    driver.isVerified
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/40'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/40'
                  }`}
                >
                  {driver.isVerified ? 'Verified' : 'Pending'}
                </button>
              </td>
              <td className="px-4 py-2 text-right">
                <button
                  onClick={() => onSelect(driver)}
                  className="inline-flex items-center text-xs px-2 py-1 rounded-md border border-slate-700 text-slate-200 hover:bg-slate-800"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
