import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Car, MapPinned, Settings, LogOut, Zap } from 'lucide-react';
import { useAuth } from '../modules/auth/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';

const navItems = [
  { to: '/admin/overview',     label: 'Overview',     icon: LayoutDashboard },
  { to: '/admin/drivers',      label: 'Drivers',      icon: Car             },
  { to: '/admin/riders',       label: 'Riders',       icon: Users           },
  { to: '/admin/active-rides', label: 'Active Rides', icon: MapPinned       },
  { to: '/admin/settings',     label: 'Settings',     icon: Settings        },
];

export const AdminLayout: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut(auth);
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* ── Sidebar ─────────────────────────────────────────────── */}
      <aside className="w-64 shrink-0 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 backdrop-blur flex flex-col transition-colors duration-300">

        {/* Brand */}
        <div className="px-6 py-5 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-zippy-brand flex items-center justify-center shadow-sm">
            <Zap className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white">Zippy Admin</h1>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-none mt-0.5">Management Console</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === '/admin/overview'}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-zippy-blue text-white shadow-sm shadow-zippy-blue/40'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.label}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer — user info + logout */}
        <div className="px-4 py-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-zippy-blue/10 dark:bg-zippy-blue/20 flex items-center justify-center shrink-0">
              <span className="text-xs font-bold text-zippy-blue">
                {(profile?.fullName || profile?.email || 'A').charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100 truncate">
                {profile?.fullName || profile?.email || 'Admin'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-zippy-blue font-medium">
                Administrator
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all duration-150"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 bg-white/80 dark:bg-slate-950/80 backdrop-blur-sm transition-colors duration-300">
          <div className="text-sm font-semibold text-slate-700 dark:text-slate-200">Dashboard</div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden sm:block">
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
            <ThemeToggle />
          </div>
        </header>

        <div className="flex-1 p-6 overflow-auto bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
