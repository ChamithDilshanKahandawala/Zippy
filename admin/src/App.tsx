import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import './index.css';
import { AuthProvider, useAuth } from './modules/auth/AuthContext';
import { AdminPrivateRoute } from './modules/auth/AdminPrivateRoute';
import { ThemeProvider } from './context/ThemeContext';
import { LoginPage } from './pages/LoginPage';
import { AdminLayout } from './layouts/AdminLayout';
import { OverviewPage } from './pages/OverviewPage';
import { DriversPage } from './pages/DriversPage';
import { PendingRidersPage } from './pages/PendingRidersPage';
import { RidersPage } from './pages/RidersPage';
import { ActiveRidesPage } from './pages/ActiveRidesPage';
import { SettingsPage } from './pages/SettingsPage';

const AppRoutes: React.FC = () => {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-zippy-blue border-t-transparent animate-spin" />
          <p className="text-sm text-slate-500 dark:text-slate-400">Initializing Zippy Admin…</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/admin"
        element={
          <AdminPrivateRoute>
            <AdminLayout />
          </AdminPrivateRoute>
        }
      >
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview"       element={<OverviewPage />}      />
        <Route path="drivers"        element={<DriversPage />}       />
        <Route path="pending-riders" element={<PendingRidersPage />} />
        <Route path="riders"         element={<RidersPage />}        />
        <Route path="active-rides"   element={<ActiveRidesPage />}   />
        <Route path="settings"       element={<SettingsPage />}      />
      </Route>
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );
};

export default App;
