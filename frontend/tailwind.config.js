/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.{js,jsx,ts,tsx}',
    './index.{js,jsx,ts,tsx}',
    './screens/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './navigation/**/*.{js,jsx,ts,tsx}',
    './context/**/*.{js,jsx,ts,tsx}',
    './hooks/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  safelist: [
    // Admin dashboard stat card dynamic colours
    'text-zippy-accent', 'text-zippy-success', 'text-zippy-warn', 'text-zippy-error',
    'border-t-zippy-accent', 'border-t-zippy-success', 'border-t-zippy-warn', 'border-t-zippy-error',
  ],
  theme: {
    extend: {
      colors: {
        // ── Zippy brand palette ──────────────────────────────────────
        zippy: {
          bg:          '#07070F', // deepest background
          surface:     '#11111C', // card / surface
          'surface-alt': '#191924', // slightly lighter surface
          border:      '#2A2A40', // default border
          accent:      '#7C3AED', // primary violet
          'accent-light': '#9F67FF', // lighter violet for text
          'accent-glow': 'rgba(124,58,237,0.25)',
          success:     '#10B981', // emerald green
          'success-glow': 'rgba(16,185,129,0.2)',
          error:       '#EF4444', // red
          'error-glow': 'rgba(239,68,68,0.2)',
          warn:        '#F59E0B', // amber
          text:        '#F1F5F9', // primary text
          muted:       '#94A3B8', // secondary text
          dim:         '#475569', // placeholder / dimmed text
          card:        '#1C1C2E', // slightly lighter than surface
          'dark':      '#1A1A2B', // search card background
        },
      },
      fontFamily: {
        sans: ['System'],
      },
    },
  },
  plugins: [],
};
