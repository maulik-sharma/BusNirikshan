import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { KeyIcon, WarningIcon, ArrowLeftIcon } from '@phosphor-icons/react';

export const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || !confirmPassword) {
      setError('Please fill in both password fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!token) {
      setError('No valid recovery token was detected in your link');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      setSuccess('Password updated successfully! Redirecting to login page...');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.message || 'Reset failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#07090e] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mb-4">
            <span className="text-emerald-500 font-bold text-2xl font-mono">N</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">New Password</h1>
          <p className="text-[#8e9bb0] text-sm">Secure your account with a fresh password</p>
        </div>

        {/* Form Panel */}
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 bg-[#0d111b]/80">
          {!token && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <WarningIcon size={18} />
              <span>Invalid Token: Please request a new link from the forgot password page.</span>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <WarningIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6 animate-pulse">
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* New Password */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                New Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                  <KeyIcon size={18} />
                </span>
                <input 
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting || !token}
                  className="w-full pl-11 pr-4 py-3 bg-[#07090e] border border-white/5 hover:border-white/10 focus:border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all font-sans text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {/* Confirm New Password */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                Confirm Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                  <KeyIcon size={18} />
                </span>
                <input 
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={isSubmitting || !token}
                  className="w-full pl-11 pr-4 py-3 bg-[#07090e] border border-white/5 hover:border-white/10 focus:border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all font-sans text-sm disabled:opacity-50"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full mt-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 text-black font-semibold rounded-xl transition-all duration-200 text-sm shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            >
              {isSubmitting ? 'Updating Password...' : 'Reset Password'}
            </button>
          </form>

          {/* Login Footer */}
          <div className="mt-8 text-center pt-6 border-t border-white/5 text-sm">
            <Link to="/login" className="inline-flex items-center gap-2 text-[#8e9bb0] hover:text-white transition-colors">
              <ArrowLeftIcon size={16} />
              <span>Back to Login</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default ResetPasswordPage;
