import React from 'react';
import { LiveMap } from '../components/LiveMap';

export const ActiveRidesPage: React.FC = () => {
  return (
    <div className="space-y-4 h-full flex flex-col">
      <div>
        <h2 className="text-xl font-semibold text-slate-50">Active Rides</h2>
        <p className="text-sm text-slate-400">Live view of ongoing trips on the map.</p>
      </div>
      <div className="flex-1 rounded-2xl border border-slate-800 bg-slate-900/60 overflow-hidden">
        <LiveMap />
      </div>
    </div>
  );
};
