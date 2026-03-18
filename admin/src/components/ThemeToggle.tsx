import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={`
        relative inline-flex items-center h-8 w-[3.75rem] rounded-full border transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-zippy-blue focus-visible:ring-offset-2
        ${isDark
          ? 'bg-zippy-blue border-zippy-blue/60'
          : 'bg-slate-200 border-slate-300'
        }
      `}
    >
      {/* Sliding pill */}
      <span
        className={`
          absolute top-[3px] h-[22px] w-[22px] rounded-full shadow-md transition-all duration-300 flex items-center justify-center
          ${isDark
            ? 'translate-x-[32px] bg-white'
            : 'translate-x-[3px] bg-white'
          }
        `}
      >
        {isDark ? (
          <Moon className="w-3.5 h-3.5 text-zippy-blue" />
        ) : (
          <Sun className="w-3.5 h-3.5 text-amber-500" />
        )}
      </span>

      {/* Background icons (decorative) */}
      <Sun
        className={`absolute left-[6px] w-3 h-3 transition-opacity duration-300 ${isDark ? 'opacity-50 text-white' : 'opacity-0'}`}
      />
      <Moon
        className={`absolute right-[6px] w-3 h-3 transition-opacity duration-300 ${isDark ? 'opacity-0' : 'opacity-40 text-slate-500'}`}
      />
    </button>
  );
};
