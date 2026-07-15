import React, { createContext, useContext, useState, useEffect } from 'react';
import { apiFetch, setAccessToken, getAccessToken } from '../api/client';

const AuthContext = createContext(null);

// Pure JS JWT decoder to avoid heavy external dependencies
const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  // Decodes and sets the in-memory access token and updates React state
  const handleAuthSuccess = (accessToken) => {
    setAccessToken(accessToken);
    const decoded = parseJwt(accessToken);
    if (decoded) {
      setUser({
        id: decoded.userId,
        name: decoded.name,
        email: decoded.email,
        role: decoded.role,
        rtc: decoded.rtc,
        isActive: decoded.isActive,
      });
    }
  };

  const login = async (email, password) => {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Login failed');
    }

    handleAuthSuccess(data.access_token);
    return data;
  };

  const logout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error('Logout request failed', e);
    } finally {
      setAccessToken('');
      setUser(null);
    }
  };

  const refreshSession = async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        handleAuthSuccess(data.access_token);
      } else {
        // Clear auth state if refresh fails
        setAccessToken('');
        setUser(null);
      }
    } catch (e) {
      console.error('Silent session recovery failed', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Attempt silent refresh on mount to restore active cookie session
    refreshSession();

    // Listen for silent refresh token expiry event
    const handleExpiry = () => {
      setUser(null);
    };

    window.addEventListener('auth_session_expired', handleExpiry);
    return () => {
      window.removeEventListener('auth_session_expired', handleExpiry);
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, refreshSession }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
