import React from 'react';

export const SettingsPage: React.FC = () => {
  return (
    <div className="space-y-3">
      <h2 className="text-xl font-semibold text-slate-50">Settings</h2>
      <p className="text-sm text-slate-400">Organisation-wide configuration for Zippy will live here.</p>
      <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm text-slate-300">
        <p>This is a stub page. You can later add:</p>
        <ul className="list-disc list-inside mt-2 space-y-1 text-slate-400">
          <li>fare rules and surge multipliers</li>
          <li>driver onboarding requirements</li>
          <li>feature flags for mobile apps</li>
        </ul>
      </div>
    </div>
  );
};
