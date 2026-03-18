import React, { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebase';

interface Rider {
  id: string;
  fullName: string;
  email: string;
  phoneNumber: string;
}

export const RidersPage: React.FC = () => {
  const [riders, setRiders] = useState<Rider[]>([]);

  useEffect(() => {
    const q = query(collection(db, 'users'), where('role', '==', 'user'));
    const unsub = onSnapshot(q, (snap) => {
      const list: Rider[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data() as any;
        list.push({
          id: docSnap.id,
          fullName: data.fullName,
          email: data.email,
          phoneNumber: data.phoneNumber,
        });
      });
      setRiders(list);
    });
    return () => unsub();
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Riders</h2>
        <p className="text-sm text-slate-400">All registered riders on the platform.</p>
      </div>
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/60">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-900/80 border-b border-slate-800">
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Name</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Email</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-slate-400">Phone</th>
            </tr>
          </thead>
          <tbody>
            {riders.map((rider) => (
              <tr key={rider.id} className="border-t border-slate-800 hover:bg-slate-800/60">
                <td className="px-4 py-2 text-slate-100">{rider.fullName}</td>
                <td className="px-4 py-2 text-slate-300">{rider.email}</td>
                <td className="px-4 py-2 text-slate-300">{rider.phoneNumber}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
