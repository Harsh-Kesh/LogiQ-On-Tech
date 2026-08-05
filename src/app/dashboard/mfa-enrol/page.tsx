'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { Lock, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

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
    <div className="max-w-2xl mx-auto space-y-6 font-sans">
      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm flex items-center gap-4">
        <div className="p-3 rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-200">
          <Lock className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Staff &amp; Vendor Multi-Factor Security (MFA)</h1>
          <p className="text-xs text-slate-500 font-mono">Acceptance Criteria #3 — TOTP 2FA Enrolment Engine</p>
        </div>
      </div>

      <div className="p-8 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <div className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Account Security Status
            </div>
            <div className="text-xs text-slate-500 mt-0.5 font-mono">Account: {session?.user?.email}</div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold font-mono bg-indigo-50 text-indigo-700 border border-indigo-200">
            Role: {(session?.user as any)?.role}
          </span>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {(session?.user as any)?.mfaEnabled && !success ? (
          <div className="text-center py-8 space-y-4 bg-emerald-50/50 rounded-2xl border border-emerald-200 p-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">MFA / 2FA is Active &amp; Account Secured</h2>
              <p className="text-xs text-slate-600 max-w-md mx-auto mt-1">
                Your account is already protected with Two-Factor Authentication. Re-configuration is locked to prevent unauthorized modifications.
              </p>
            </div>
            <div className="inline-block px-3.5 py-1 rounded-full text-[11px] font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
              Status: 2FA Enrolment Locked &amp; Operational
            </div>
          </div>
        ) : !qrCodeUrl ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
              Secure your account using Google Authenticator, Authy, or 1Password. Click below to generate your 2FA setup QR Code.
            </p>
            <Button onClick={handleStartSetup} isLoading={loading}>
              Generate 2FA Setup QR Code
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl bg-slate-50 border border-slate-200">
              <div className="bg-white p-2 rounded-xl border border-slate-200 shrink-0">
                <img src={qrCodeUrl} alt="MFA QR Code" className="w-36 h-36" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="font-bold text-slate-900 uppercase tracking-wider text-[11px] text-indigo-700">
                  Step 1: Scan with Authenticator App
                </div>
                <p className="text-slate-600 leading-relaxed">
                  Scan this QR code using Google Authenticator or Microsoft Authenticator app on your phone.
                </p>
                <div className="pt-1 font-mono text-[11px] text-slate-700">
                  Secret Key: <span className="text-indigo-700 bg-white px-2 py-0.5 rounded border border-slate-200 font-bold">{secret}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Input
                label="Step 2: Enter 6-Digit OTP Token"
                maxLength={6}
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. 123456"
              />

              <Button type="submit" variant="success" className="w-full" isLoading={loading}>
                Verify OTP &amp; Complete MFA Enrolment
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
