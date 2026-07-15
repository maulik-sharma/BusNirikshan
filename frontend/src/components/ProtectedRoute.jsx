import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col justify-center items-center bg-[#07090e] gap-4">
        {/* Shimmering Brand Logo Loader */}
        <div className="relative w-16 h-16 rounded-2xl border border-emerald-500/30 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 bg-emerald-500/5 animate-pulse" />
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500 animate-bounce" />
        </div>
        <p className="text-[#8e9bb0] font-mono text-sm tracking-widest animate-pulse">
          VERIFYING SECURITY CREDENTIALS...
        </p>
      </div>
    );
  }

  if (!user) {
    // Redirect to login page and store current location for post-login redirect
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to appropriate dashboard based on user role
    const defaultRedirect = user.role === 'admin' 
      ? '/admin' 
      : user.role === 'driver' 
        ? '/driver' 
        : '/dashboard';
        
    return <Navigate to={defaultRedirect} replace />;
  }

  return children;
};
