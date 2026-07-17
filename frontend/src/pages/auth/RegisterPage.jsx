import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { apiFetch } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { EnvelopeIcon, KeyIcon, UserIcon, ShieldIcon, WarningIcon } from '@phosphor-icons/react';

export const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // Default to standard 'user' role
  const [rtc, setRtc] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const navigate = useNavigate();
  const { user } = useAuth();

  // Redirect if session is silently restored
  useEffect(() => {
    if (user) {
      if (user.role === 'admin') navigate('/admin', { replace: true });
      else if (user.role === 'driver') navigate('/driver', { replace: true });
      else navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      setError('Please fill in all mandatory fields');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const response = await apiFetch('/api/auth/register/init', {
        method: 'POST',
        body: JSON.stringify({ 
          name, 
          email, 
          password, 
          role, 
          rtc: role === 'driver' ? rtc : undefined,
          licenseNumber: role === 'driver' ? licenseNumber : undefined 
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Registration initialization failed');
      }

      // Redirect to OTP verification page with pre-filled email
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-[#07090e] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mb-4">
            <span className="text-emerald-500 font-bold text-2xl font-mono">N</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Create Account</h1>
          <p className="text-[#8e9bb0] text-sm">Join the real-time tracking network</p>
        </div>

        {/* Form Panel */}
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 bg-[#0d111b]/80">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <WarningIcon size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Display Name Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                Display Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                  <UserIcon size={18} />
                </span>
                <input 
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  required
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 bg-[#07090e] border border-white/5 hover:border-white/10 focus:border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all font-sans text-sm"
                />
              </div>
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                Email Address
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

            {/* Password Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                Password
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
                  disabled={isSubmitting}
                  className="w-full pl-11 pr-4 py-3 bg-[#07090e] border border-white/5 hover:border-white/10 focus:border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all font-sans text-sm"
                />
              </div>
            </div>

            {/* Role Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                Account Type
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setRole('user')}
                  className={`py-3.5 rounded-xl border text-sm font-medium transition-all ${
                    role === 'user'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                      : 'bg-[#07090e] border-white/5 text-[#8e9bb0] hover:border-white/10'
                  }`}
                >
                  Passenger
                </button>
                <button
                  type="button"
                  onClick={() => setRole('driver')}
                  className={`py-3.5 rounded-xl border text-sm font-medium transition-all ${
                    role === 'driver'
                      ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500'
                      : 'bg-[#07090e] border-white/5 text-[#8e9bb0] hover:border-white/10'
                  }`}
                >
                  Driver
                </button>
              </div>
            </div>

            {/* Conditionally Render RTC Field for Drivers */}
            {role === 'driver' && (
              <>
                <div className="space-y-2 animate-fade-in-up">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                    RTC Corporation
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                      <ShieldIcon size={18} />
                    </span>
                    <input 
                      type="text"
                      value={rtc}
                      onChange={(e) => setRtc(e.target.value)}
                      placeholder="GSRTC"
                      required
                      disabled={isSubmitting}
                      className="w-full pl-11 pr-4 py-3 bg-[#07090e] border border-white/5 hover:border-white/10 focus:border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all font-sans text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2 animate-fade-in-up delay-75">
                  <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                    License Number
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                      <ShieldIcon size={18} />
                    </span>
                    <input 
                      type="text"
                      value={licenseNumber}
                      onChange={(e) => setLicenseNumber(e.target.value)}
                      placeholder="GJ01-20240001"
                      required
                      disabled={isSubmitting}
                      className="w-full pl-11 pr-4 py-3 bg-[#07090e] border border-white/5 hover:border-white/10 focus:border-emerald-500/40 rounded-xl text-white placeholder-slate-600 focus:outline-none transition-all font-sans text-sm"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 text-black font-semibold rounded-xl transition-all duration-200 text-sm shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            >
              {isSubmitting ? 'Sending OTP Code...' : 'Register Profile'}
            </button>
          </form>

          {/* Login Footer */}
          <div className="mt-8 text-center pt-6 border-t border-white/5 text-sm text-[#8e9bb0]">
            Already have an account?{' '}
            <Link to="/login" className="text-emerald-500 hover:underline font-semibold">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default RegisterPage;
