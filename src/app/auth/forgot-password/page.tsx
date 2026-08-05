'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Shield, KeyRound, AlertCircle, CheckCircle2, Eye, EyeOff, Send, Lock } from 'lucide-react';
import { isValidEmail, validatePasswordPolicy } from '@/lib/validation';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [demoCode, setDemoCode] = useState('');

  // Password Policy live check
  const passwordResult = validatePasswordPolicy(newPassword);

  // Step 1: Request 6-Digit OTP Reset Code
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (!isValidEmail(email)) {
      setError('Please enter a valid account email address.');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'REQUEST_OTP', email }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to request password reset code');
      } else {
        setSuccess('🎉 6-Digit Verification Code sent! Check your inbox (or copy the demo code below).');
        if (data.demoOtpCode) {
          setDemoCode(data.demoOtpCode);
          setOtpCode(data.demoOtpCode); // Auto-fill demo code for seamless testing
        }
        setStep(2);
      }
    } catch (err: any) {
      setError('A network error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handleVerifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    if (otpCode.trim().length !== 6) {
      setError('Please enter a 6-digit verification code.');
      setLoading(false);
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    if (!passwordResult.valid) {
      setError(`Password requirements not met: ${passwordResult.errors[0]}`);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'VERIFY_AND_RESET',
          email,
          otpCode,
          newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Password reset failed');
      } else {
        setSuccess('🎉 Password reset successfully! Redirecting to login portal...');
        setTimeout(() => {
          window.location.href = '/auth/login';
        }, 1500);
      }
    } catch (err: any) {
      setError('An error occurred while setting your new password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 mb-3">
            <KeyRound className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">Reset Account Password</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">2-Step Email Verification OTP Reset</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6 font-mono text-xs">
          <span className={`px-3 py-1 rounded-full font-bold ${step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            1. Request Code
          </span>
          <span className="text-slate-600">→</span>
          <span className={`px-3 py-1 rounded-full font-bold ${step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
            2. Verify & Reset
          </span>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* STEP 1: Request Reset Code */}
        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Account Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. admin@logiqon.tech"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Sending Verification Code...' : 'Send 6-Digit Reset Code'}
            </button>
          </form>
        ) : (
          /* STEP 2: Verify OTP & Enter New Password */
          <form onSubmit={handleVerifyAndReset} className="space-y-4">
            {demoCode && (
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs font-mono text-indigo-300 flex items-center justify-between">
                <span>Demo Staging OTP Code:</span>
                <span className="font-bold text-amber-400 text-sm tracking-widest">{demoCode}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-sky-400 mb-1.5 uppercase tracking-wider font-mono">
                6-Digit Email Verification Code
              </label>
              <input
                type="text"
                maxLength={6}
                required
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value)}
                placeholder="e.g. 123456"
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-sky-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {newPassword && (
                <div className="mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1">
                  <div className={newPassword.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ Min 8 characters
                  </div>
                  <div className={/[A-Z]/.test(newPassword) && /[a-z]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ Uppercase & Lowercase letter
                  </div>
                  <div className={/[0-9]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ At least one number (0-9)
                  </div>
                  <div className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword) ? 'text-emerald-400' : 'text-slate-500'}>
                    ✓ At least one special character (!@#$)
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-2.5 pr-11 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              <Lock className="w-4 h-4" />
              {loading ? 'Verifying & Resetting Password...' : 'Verify Code & Update Password'}
            </button>
          </form>
        )}

        <div className="text-center text-xs text-slate-400 mt-6">
          Back to{' '}
          <Link href="/auth/login" className="text-indigo-400 font-semibold hover:underline">
            Sign In Portal
          </Link>
        </div>
      </div>
    </div>
  );
}
