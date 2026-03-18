import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, subtitle, icon: Icon }) => {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 px-4 py-3 flex items-center justify-between shadow-sm transition-colors duration-300">
      <div>
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="mt-1 text-2xl font-semibold text-slate-900 dark:text-slate-50">{value}</p>
        {subtitle && <p className="mt-1 text-xs text-emerald-500 dark:text-emerald-400">{subtitle}</p>}
      </div>
      <div className="h-10 w-10 rounded-full bg-zippy-blue/10 dark:bg-slate-800 flex items-center justify-center">
        <Icon className="w-5 h-5 text-zippy-blue dark:text-indigo-400" />
      </div>
    </div>
  );
};

