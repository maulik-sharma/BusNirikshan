import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Envelope, Key, Warning } from '@phosphor-icons/react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Please fill in all credentials');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const data = await login(email, password);
      // Determine dashboard based on user role
      const decodedToken = JSON.parse(window.atob(data.access_token.split('.')[1]));
      const role = decodedToken.role;
      
      if (role === 'admin') navigate('/admin');
      else if (role === 'driver') navigate('/driver');
      else navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Invalid email or password');
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
          <h1 className="text-3xl font-extrabold tracking-tight text-white mb-2">Welcome Back</h1>
          <p className="text-[#8e9bb0] text-sm">Sign in to track real-time bus locations</p>
        </div>

        {/* Form Panel */}
        <div className="liquid-glass p-8 rounded-[2.5rem] border border-white/5 bg-[#0d111b]/80">
          {error && (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6">
              <Warning size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                  <Envelope size={18} />
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
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#8e9bb0] uppercase tracking-wider block">
                  Password
                </label>
                <Link 
                  to="/forgot-password" 
                  className="text-xs text-emerald-500 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center text-[#8e9bb0]">
                  <Key size={18} />
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

            {/* Submit Button */}
            <button 
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-500 hover:bg-emerald-600 active:scale-[0.98] disabled:active:scale-100 disabled:opacity-50 text-black font-semibold rounded-xl transition-all duration-200 text-sm shadow-[0_4px_12px_rgba(16,185,129,0.2)]"
            >
              {isSubmitting ? 'Authenticating...' : 'Sign In'}
            </button>
          </form>

          {/* Register Footer */}
          <div className="mt-8 text-center pt-6 border-t border-white/5 text-sm text-[#8e9bb0]">
            Don't have an account?{' '}
            <Link to="/register" className="text-emerald-500 hover:underline font-semibold">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
export default LoginPage;
