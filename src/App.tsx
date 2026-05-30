/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LeadProvider } from './context/LeadContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import Store from './pages/Store';

import { UserRole } from './types';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#3291B6] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-500 text-sm font-medium animate-pulse">Verifying active session...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" />;

  const isAdmin = user.role === UserRole.ADMIN || user.role === 'admin';
  const isStaff = user.role === UserRole.STAFF || user.role === 'staff';

  // Admin and Staff can access admin panel
  if (adminOnly && !isAdmin && !isStaff) {
    return <Navigate to="/dashboard" />;
  }

  // Admin should be redirected to admin dashboard if accessing normal dashboard
  if (!adminOnly && isAdmin) {
    return <Navigate to="/admin" />;
  }

  // Staff and other roles should stay on /dashboard to see their portals
  return children;
};

function AppRoutes() {
  const { adminOnlyRegistration } = useAuth();

  return (
    <Router>
      <Routes>
        {/* Landing Page */}
        <Route path="/Pallywear" element={<Store />} />
        <Route path="/store" element={<Navigate to="/Pallywear" />} />

        {/* Auth */}
        <Route path="/login" element={<Login />} />
        <Route
          path="/register"
          element={
            adminOnlyRegistration ? (
              <ProtectedRoute adminOnly={true}>
                <Register />
              </ProtectedRoute>
            ) : (
              <Register />
            )
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute adminOnly={true}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />

        {/* Redirects */}
        <Route path="/" element={<Navigate to="/Pallywear" />} />
        <Route path="*" element={<Navigate to="/dashboard" />} />
      </Routes>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LeadProvider>
        <AppRoutes />
      </LeadProvider>
    </AuthProvider>
  );
}

