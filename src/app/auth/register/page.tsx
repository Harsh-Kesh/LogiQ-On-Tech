'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Shield, Building, ShoppingCart, AlertCircle, CheckCircle2, Eye, EyeOff, Info } from 'lucide-react';
import {
  isValidEmail,
  validatePasswordPolicy,
  isValidFullName,
  isValidCompanyName,
  isValidAbnAcn,
} from '@/lib/validation';

export default function RegisterPage() {
  const router = useRouter();

  const [accountType, setAccountType] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [companyName, setCompanyName] = useState('');
  const [abnAcn, setAbnAcn] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Password policy live checks
  const passwordResult = validatePasswordPolicy(password);
  const abnResult = accountType === 'VENDOR' && abnAcn ? isValidAbnAcn(abnAcn) : { valid: true };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Client-side Validation Checks
    if (!isValidEmail(email)) {
      setError('Please enter a valid email address.');
      setLoading(false);
      return;
    }

    if (!isValidFullName(fullName)) {
      setError('Full name must be at least 2 characters.');
      setLoading(false);
      return;
    }

    if (!passwordResult.valid) {
      setError(`Password requirements not met: ${passwordResult.errors[0]}`);
      setLoading(false);
      return;
    }

    if (accountType === 'VENDOR') {
      if (!isValidCompanyName(companyName)) {
        setError('Company name must be at least 3 characters long.');
        setLoading(false);
        return;
      }

      const abnCheck = isValidAbnAcn(abnAcn);
      if (!abnCheck.valid) {
        setError(abnCheck.message || 'Invalid ABN/ACN number.');
        setLoading(false);
        return;
      }
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          email,
          password,
          role: accountType,
          companyName: accountType === 'VENDOR' ? companyName : undefined,
          abnAcn: accountType === 'VENDOR' ? abnAcn : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
      } else {
        setSuccess(
          accountType === 'VENDOR'
            ? '🎉 Vendor Application Submitted! Account created under PENDING review status.'
            : '🎉 Customer Registration Successful! Redirecting to login portal...'
        );
        setTimeout(() => {
          router.push('/auth/login');
        }, 1500);
      }
    } catch (err: any) {
      setError('An unexpected network error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white">LogiQ-On Tech</h1>
          <p className="text-xs text-slate-400 font-mono mt-1">Multi-Tenant Account Registration</p>
        </div>

        {/* Account Type Selector Tabs */}
        <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-slate-950 border border-slate-800 mb-6 font-mono text-xs">
          <button
            type="button"
            onClick={() => setAccountType('CUSTOMER')}
            className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              accountType === 'CUSTOMER'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" /> Customer
          </button>

          <button
            type="button"
            onClick={() => setAccountType('VENDOR')}
            className={`py-2 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
              accountType === 'VENDOR'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Building className="w-3.5 h-3.5" /> Vendor Application
          </button>
        </div>

        {/* Notifications */}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Full Name / Primary Contact
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Sarah Jenkins"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. sarah@example.com"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
            />
          </div>

          {accountType === 'VENDOR' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-amber-400 mb-1.5 uppercase tracking-wider font-mono">
                  Company Name
                </label>
                <input
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Apex Logistics Solutions Pty Ltd"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-amber-500 transition-all placeholder:text-slate-600"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-semibold text-amber-400 uppercase tracking-wider font-mono">
                    Australian ABN (11 Digits) / ACN (9 Digits)
                  </label>
                  <span className="text-[10px] font-mono text-slate-500">Statutory Checksum</span>
                </div>
                <input
                  type="text"
                  required
                  value={abnAcn}
                  onChange={(e) => setAbnAcn(e.target.value)}
                  placeholder="e.g. 51 824 753 556 (11 digits)"
                  className={`w-full px-4 py-2.5 rounded-xl bg-slate-950 border text-white text-sm focus:outline-none transition-all placeholder:text-slate-600 font-mono ${
                    abnAcn && !abnResult.valid ? 'border-red-500 focus:border-red-500' : 'border-slate-800 focus:border-amber-500'
                  }`}
                />
                {abnAcn && !abnResult.valid && (
                  <p className="text-[11px] text-red-400 font-mono mt-1 flex items-center gap-1">
                    <Info className="w-3 h-3" /> {abnResult.message}
                  </p>
                )}
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

            {/* Live Password Rules Indicator */}
            {password && (
              <div className="mt-2 p-2 rounded-lg bg-slate-950 border border-slate-800 text-[11px] font-mono space-y-1">
                <div className={password.length >= 8 ? 'text-emerald-400' : 'text-slate-500'}>
                  ✓ Min 8 characters
                </div>
                <div className={/[A-Z]/.test(password) && /[a-z]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}>
                  ✓ Uppercase & Lowercase letter
                </div>
                <div className={/[0-9]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}>
                  ✓ At least one number (0-9)
                </div>
                <div className={/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password) ? 'text-emerald-400' : 'text-slate-500'}>
                  ✓ At least one special character (!@#$)
                </div>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg transition-all disabled:opacity-50 mt-2 ${
              accountType === 'VENDOR'
                ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
            }`}
          >
            {loading
              ? 'Processing Registration...'
              : accountType === 'VENDOR'
              ? 'Submit Vendor Application'
              : 'Create Customer Account'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-400 mt-6">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-indigo-400 font-semibold hover:underline">
            Sign In here
          </Link>
        </div>
      </div>
    </div>
  );
}
