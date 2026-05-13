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

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" />;

  // If admin-only route and user is not admin, redirect to user dashboard
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  // If regular user tries to access admin dashboard, redirect
  if (!adminOnly && user.role === 'admin' && window.location.pathname === '/dashboard') {
    return <Navigate to="/admin" />;
  }

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
            <ProtectedRoute adminOnly={adminOnlyRegistration}>
              <Register />
            </ProtectedRoute>
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
        <Route path="*" element={<Navigate to="/Pallywear" />} />
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

