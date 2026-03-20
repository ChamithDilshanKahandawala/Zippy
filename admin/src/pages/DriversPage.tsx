import React from 'react';
import { DriverTable } from '../components/DriverTable';

export const DriversPage: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-50">Drivers</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          Review, verify, and manage all registered drivers on the Zippy platform.
        </p>
      </div>
      <DriverTable />
    </div>
  );
};
