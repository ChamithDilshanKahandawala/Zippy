import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../firebase';
import { Eye, EyeOff, AlertCircle, Zap, ShieldCheck, LayoutDashboard, Activity } from 'lucide-react';

// ── Helpers ──────────────────────────────────────
const mapFirebaseError = (code: string): string => {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Invalid admin credentials. Please try again.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Account temporarily locked.';
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and retry.';
    default:
      return 'Authentication failed. Please try again.';
  }
};

// ── Loading Spinner ───────────────────────────────
const Spinner: React.FC = () => (
  <svg
    className="animate-spin h-4 w-4 text-white"
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
  >
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

// ── Feature bullet ────────────────────────────────
const Feature: React.FC<{ icon: React.ReactNode; text: string }> = ({ icon, text }) => (
  <div className="flex items-center gap-3 text-blue-100/80 text-sm">
    <span className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center shrink-0">
      {icon}
    </span>
    {text}
  </div>
);

// ── Main Login Page ───────────────────────────────
export const LoginPage: React.FC = () => {
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPass, setShowPass]     = useState(false);
  const [remember, setRemember]     = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [loading, setLoading]       = useState(false);

  const navigate  = useNavigate();
  const location  = useLocation() as any;
  const from      = location.state?.from?.pathname || '/admin';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(mapFirebaseError(err.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 transition-colors duration-300">

      {/* ── LEFT: Branded Panel ────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[52%] relative flex-col justify-between px-12 py-10 overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #001055 0%, #0039c8 45%, #0052FF 75%, #3b8cff 100%)' }}
      >
        {/* Decorative blobs */}
        <div className="absolute -top-20 -left-20 h-80 w-80 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-10 right-0 h-96 w-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute top-1/3 right-[-60px] h-64 w-64 rounded-full bg-blue-300/10 blur-2xl" />

        {/* Grid dot pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        {/* Brand logo */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center shadow-lg">
            <Zap className="w-5 h-5 text-white" />
          </div>
          <div>
            <span className="text-xl font-bold text-white tracking-tight">Zippy</span>
            <span className="ml-1.5 text-xs font-medium text-blue-200/70 uppercase tracking-widest">Admin</span>
          </div>
        </div>

        {/* Hero copy */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
              Ride Operations<br />Command Center
            </h2>
            <p className="text-blue-100/70 text-base leading-relaxed max-w-xs">
              Real-time visibility into every driver, rider, and active trip across the Zippy network.
            </p>
          </div>

          <div className="space-y-3">
            <Feature icon={<LayoutDashboard className="w-3.5 h-3.5 text-blue-200" />} text="Live fleet & trip monitoring" />
            <Feature icon={<Activity className="w-3.5 h-3.5 text-blue-200" />} text="Real-time earnings analytics" />
            <Feature icon={<ShieldCheck className="w-3.5 h-3.5 text-blue-200" />} text="Secure role-based access control" />
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-blue-200/40 text-xs">
          © {new Date().getFullYear()} Zippy Technologies. All rights reserved.
        </div>
      </div>

      {/* ── RIGHT: Login Form ─────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">

          {/* Mobile brand (visible on small screens only) */}
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="h-8 w-8 rounded-lg bg-zippy-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">Zippy Admin</span>
          </div>

          {/* Card */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl shadow-slate-200/60 dark:shadow-none p-8 space-y-6 backdrop-blur-md">

            {/* Header */}
            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Sign in to your admin account to continue.
              </p>
            </div>

            {/* Error Banner */}
            {error && (
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-px" />
                <p className="text-sm text-red-700 dark:text-red-400 leading-snug">{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Email Address
                </label>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="admin@zippy.lk"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="
                    w-full rounded-xl border border-slate-200 dark:border-slate-700
                    bg-slate-50 dark:bg-slate-800/60
                    px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100
                    placeholder-slate-400 dark:placeholder-slate-500
                    focus:outline-none focus:ring-2 focus:ring-zippy-blue focus:border-transparent
                    transition-all duration-150
                  "
                />
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wide">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="
                      w-full rounded-xl border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-800/60
                      px-4 py-2.5 pr-11 text-sm text-slate-900 dark:text-slate-100
                      placeholder-slate-400 dark:placeholder-slate-500
                      focus:outline-none focus:ring-2 focus:ring-zippy-blue focus:border-transparent
                      transition-all duration-150
                    "
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    aria-label={showPass ? 'Hide password' : 'Show password'}
                  >
                    {showPass
                      ? <EyeOff className="w-4 h-4" />
                      : <Eye    className="w-4 h-4" />
                    }
                  </button>
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2.5">
                <input
                  id="remember"
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-zippy-blue focus:ring-zippy-blue focus:ring-offset-0 bg-slate-50 dark:bg-slate-800 cursor-pointer"
                />
                <label htmlFor="remember" className="text-sm text-slate-600 dark:text-slate-400 cursor-pointer select-none">
                  Keep me signed in
                </label>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="
                  w-full flex items-center justify-center gap-2 rounded-xl
                  bg-zippy-blue hover:bg-zippy-blue-dark
                  disabled:opacity-60 disabled:cursor-not-allowed
                  px-4 py-3 text-sm font-semibold text-white
                  shadow-md shadow-zippy-blue/30 hover:shadow-lg hover:shadow-zippy-blue/40
                  transition-all duration-200
                "
              >
                {loading ? (
                  <>
                    <Spinner />
                    <span>Signing in…</span>
                  </>
                ) : (
                  <span>Sign In to Dashboard</span>
                )}
              </button>
            </form>
          </div>

          {/* Footer note */}
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-slate-600">
            Authorised personnel only. Suspicious activity is logged.
          </p>
        </div>
      </div>
    </div>
  );
};
