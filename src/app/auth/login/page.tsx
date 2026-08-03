'use client';

import { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Shield, Building, Warehouse, ShoppingCart, UserCheck, AlertCircle, CheckCircle2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleDemoFill = (demoEmail: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError('');
    setSuccess(`Loaded credentials for ${roleName} demo account! Click Sign In.`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (res?.error) {
        setError(res.error);
        setLoading(false);
      } else {
        setSuccess('Authentication successful! Redirecting to role dashboard...');
        setTimeout(() => {
          router.push(callbackUrl);
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
      {/* Header Branding */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-sky-400 flex items-center justify-center shadow-lg shadow-indigo-500/20 mb-3">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight">LogiQ-On Tech</h1>
        <p className="text-xs text-slate-400 font-mono mt-1">Multi-Tenant Platform Authentication — KAN-2</p>
      </div>

      {/* 1-Click Role Switcher Demo Buttons */}
      <div className="mb-6 bg-slate-950/70 border border-slate-800/80 rounded-xl p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
          <UserCheck className="w-3.5 h-3.5" />
          1-Click Demo Accounts (Acceptance Criteria #2)
        </div>
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => handleDemoFill('admin@logiqon.tech', 'Platform Owner')}
            className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-xs"
          >
            <Shield className="w-4 h-4 text-indigo-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Owner / Admin</div>
              <div className="text-[10px] text-slate-400">Full System Access</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoFill('vendor@logiqon.tech', 'Vendor')}
            className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-xs"
          >
            <Building className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Vendor</div>
              <div className="text-[10px] text-slate-400">Catalog & Docs</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoFill('warehouse@logiqon.tech', 'Warehouse')}
            className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-xs"
          >
            <Warehouse className="w-4 h-4 text-emerald-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Warehouse</div>
              <div className="text-[10px] text-slate-400">Stock & Ledger</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleDemoFill('customer@logiqon.tech', 'Customer')}
            className="flex items-center gap-2 p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-left transition-all text-xs"
          >
            <ShoppingCart className="w-4 h-4 text-sky-400 shrink-0" />
            <div>
              <div className="font-bold text-white">Customer</div>
              <div className="text-[10px] text-slate-400">Orders & CRM</div>
            </div>
          </button>
        </div>
      </div>

      {/* Error / Success Notifications */}
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

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            Email Address
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="e.g., admin@logiqon.tech"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••••••"
            className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
          />
        </div>

        <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
          <Link href="/auth/register" className="hover:text-indigo-400 transition-colors">
            Create an account
          </Link>
          <Link href="/auth/forgot-password" className="hover:text-indigo-400 transition-colors">
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 mt-2"
        >
          {loading ? 'Authenticating & Verifying Session...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans flex items-center justify-center p-4">
      <Suspense fallback={<div className="text-slate-400 text-xs font-mono">Loading authentication portal...</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
