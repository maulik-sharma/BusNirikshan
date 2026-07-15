import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Auth Pages
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { VerifyOtpPage } from './pages/auth/VerifyOtpPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { ResetPasswordPage } from './pages/auth/ResetPasswordPage';

// Passenger Pages
import { DashboardPage as PassengerDashboard } from './pages/passenger/DashboardPage';
import { StopDetailPage } from './pages/passenger/StopDetailPage';
import { RoutesPage } from './pages/passenger/RoutesPage';
import { AlertsPage } from './pages/passenger/AlertsPage';

// Driver Pages
import { DashboardPage as DriverDashboard } from './pages/driver/DashboardPage';
import { ShiftHistoryPage } from './pages/driver/ShiftHistoryPage';

// Admin Pages
import { DashboardPage as AdminDashboard } from './pages/admin/DashboardPage';
import { BusManagePage } from './pages/admin/BusManagePage';
import { StopManagePage } from './pages/admin/StopManagePage';
import { RouteManagePage } from './pages/admin/RouteManagePage';
import { DriverManagePage } from './pages/admin/DriverManagePage';
import { UserManagePage } from './pages/admin/UserManagePage';
import { SystemHealthPage } from './pages/admin/SystemHealthPage';

import './App.css';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public Auth Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/verify-otp" element={<VerifyOtpPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />

          {/* Protected Passenger Routes */}
          <Route element={<ProtectedRoute allowedRoles={['user']}><Layout /></ProtectedRoute>}>
            <Route path="/dashboard" element={<PassengerDashboard />} />
            <Route path="/stops/:stopId" element={<StopDetailPage />} />
            <Route path="/stops" element={<StopDetailPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Route>

          {/* Protected Driver Routes */}
          <Route element={<ProtectedRoute allowedRoles={['driver']}><Layout /></ProtectedRoute>}>
            <Route path="/driver" element={<DriverDashboard />} />
            <Route path="/driver/history" element={<ShiftHistoryPage />} />
          </Route>

          {/* Protected Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/admin/buses" element={<BusManagePage />} />
            <Route path="/admin/stops" element={<StopManagePage />} />
            <Route path="/admin/routes" element={<RouteManagePage />} />
            <Route path="/admin/drivers" element={<DriverManagePage />} />
            <Route path="/admin/users" element={<UserManagePage />} />
            <Route path="/admin/health" element={<SystemHealthPage />} />
          </Route>

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
