'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lock, QrCode, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

export default function MfaEnrolPage() {
  const { data: session, update } = useSession();
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleStartSetup = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/mfa/setup', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to initialize MFA setup');
      } else {
        setSecret(data.secret);
        setQrCodeUrl(data.qrCodeUrl);
      }
    } catch (e: any) {
      setError('An error occurred initializing MFA.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/auth/mfa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, secret }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Verification failed');
      } else {
        await update({ mfaEnabled: true });
        setSuccess('🎉 MFA Enrolment Successful! Staff account is now secured with 2FA.');
      }
    } catch (e: any) {
      setError('Error verifying OTP token.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="p-6 rounded-2xl bg-gradient-to-r from-indigo-950/40 via-slate-900 to-slate-900 border border-indigo-500/20">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-600/20 text-indigo-400 border border-indigo-500/30">
            <Lock className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Staff & Vendor Multi-Factor Authentication (MFA)</h1>
            <p className="text-xs text-slate-400 font-mono">Acceptance Criteria #3 — TOTP 2FA Enrolment Engine</p>
          </div>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <div className="text-sm font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Account Security Status
            </div>
            <div className="text-xs text-slate-400 mt-0.5">Account: {session?.user?.email}</div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Role: {(session?.user as any)?.role}
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {(session?.user as any)?.mfaEnabled && !success ? (
          <div className="text-center py-8 space-y-4 bg-slate-950/60 rounded-xl border border-emerald-500/20 p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">MFA / 2FA is Active & Account Secured</h2>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
                Your account is already protected with Two-Factor Authentication. Re-configuration is locked to prevent unauthorized modifications.
              </p>
            </div>
            <div className="inline-block px-3 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Status: 2FA Enrolment Locked & Operational
            </div>
          </div>
        ) : !qrCodeUrl ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Secure your account using Google Authenticator, Authy, or 1Password. Click below to generate your 2FA setup QR Code.
            </p>
            <button
              onClick={handleStartSetup}
              disabled={loading}
              className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
            >
              {loading ? 'Generating QR Code...' : 'Generate 2FA Setup QR Code'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl bg-slate-950 border border-slate-800">
              <div className="bg-white p-2 rounded-xl shrink-0">
                <img src={qrCodeUrl} alt="MFA QR Code" className="w-36 h-36" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="font-bold text-white uppercase tracking-wider text-[11px] text-indigo-400">
                  Step 1: Scan with Authenticator App
                </div>
                <p className="text-slate-400">
                  Scan this QR code using Google Authenticator or Microsoft Authenticator app on your phone.
                </p>
                <div className="pt-1 font-mono text-[11px] text-slate-300">
                  Secret Key: <span className="text-amber-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">{secret}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                  Step 2: Enter 6-Digit OTP Token
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="e.g. 123456"
                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white text-sm font-mono tracking-widest text-center focus:outline-none focus:border-indigo-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Verifying OTP Token...' : 'Verify OTP & Complete MFA Enrolment'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
