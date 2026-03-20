import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  /** When true, renders the card in an amber/warning accent to draw attention */
  highlight?: boolean;
}

export const StatsCard: React.FC<StatsCardProps> = ({ label, value, subtitle, icon: Icon, highlight = false }) => {
  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center justify-between shadow-sm transition-colors duration-300 ${
      highlight
        ? 'border-amber-200 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10'
        : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60'
    }`}>
      <div>
        <p className={`text-xs font-medium uppercase tracking-wide ${
          highlight ? 'text-amber-600 dark:text-amber-400' : 'text-slate-500 dark:text-slate-400'
        }`}>{label}</p>
        <p className={`mt-1 text-2xl font-semibold ${
          highlight ? 'text-amber-700 dark:text-amber-300' : 'text-slate-900 dark:text-slate-50'
        }`}>{value}</p>
        {subtitle && <p className="mt-1 text-xs text-emerald-500 dark:text-emerald-400">{subtitle}</p>}
      </div>
      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
        highlight ? 'bg-amber-100 dark:bg-amber-500/20' : 'bg-zippy-blue/10 dark:bg-slate-800'
      }`}>
        <Icon className={`w-5 h-5 ${highlight ? 'text-amber-600 dark:text-amber-400' : 'text-zippy-blue dark:text-indigo-400'}`} />
      </div>
    </div>
  );
};
