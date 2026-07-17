import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { EnvelopeIcon, WarningIcon, ArrowLeftIcon } from '@phosphor-icons/react';

export const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please provide an email address');
      return;
    }

    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiFetch('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send recovery request');
      }

      setSuccess('If an account is associated with this email, a reset link will be sent shortly.');
    } catch (err) {
      setError(err.message || 'Request failed');
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
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Reset Password</h1>
          <p className="text-[#8e9bb0] text-sm">Request a reset link for your account</p>
        </div>

        {/* Form Panel */}
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 bg-[#0d111b]/80">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <WarningIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm mb-6">
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                Account Email
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                  <EnvelopeIcon size={18} />
                </span>
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 bg-[#07090e] border border-white/5 hover:border-white/10 focus:border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all font-sans text-sm"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 text-black font-semibold rounded-xl transition-all duration-200 text-sm shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            >
              {isSubmitting ? 'Sending Request...' : 'Send Recovery Link'}
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
export default ForgotPasswordPage;
