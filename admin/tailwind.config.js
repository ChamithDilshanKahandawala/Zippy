/***********************************************************
 * Tailwind config for Zippy Admin (web dashboard)
 ***********************************************************/

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        zippy: {
          blue:       '#0052FF',
          'blue-dark':'#003ED4',
          'blue-mid': '#0047E0',
          // Surface tokens
          'dark-bg':  '#020617',   // slate-950
          'dark-surface': '#0f172a', // slate-900
          'dark-border':  '#1e293b', // slate-800
          'light-bg': '#f8fafc',   // slate-50
          'light-surface': '#ffffff',
          'light-border':  '#e2e8f0', // slate-200
          // Legacy compat
          accent: '#0052FF',
        },
      },
      backgroundImage: {
        'zippy-brand': 'linear-gradient(135deg, #001f7a 0%, #0052FF 55%, #3b8cff 100%)',
      },
      boxShadow: {
        'input-focus': '0 0 0 3px rgba(0,82,255,0.25)',
      },
    },
  },
  plugins: [],
};
