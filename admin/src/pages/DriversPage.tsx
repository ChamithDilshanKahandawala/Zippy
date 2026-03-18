import React, { useState } from 'react';
import { DriverTable } from '../components/DriverTable';
import { DriverDetailsModal } from '../components/DriverDetailsModal';

export const DriversPage: React.FC = () => {
  const [selectedDriver, setSelectedDriver] = useState<any | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-slate-50">Drivers</h2>
          <p className="text-sm text-slate-400">Review and verify drivers on the platform.</p>
        </div>
      </div>
      <DriverTable
        onSelect={(driver) => {
          setSelectedDriver(driver);
          setOpen(true);
        }}
      />
      <DriverDetailsModal open={open} onClose={() => setOpen(false)} driver={selectedDriver} />
    </div>
  );
};
