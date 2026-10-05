'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, CheckCircle2, AlertCircle, ShieldCheck, ArrowRight } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';

export default function MfaEnrolPage() {
  const { data: session, update } = useSession();
  const searchParams = useSearchParams();
  // Platform Owner accounts land here with ?mandatory=1 and cannot skip.
  const isMandatory = searchParams?.get('mandatory') === '1';

  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const userRole = (session?.user as any)?.role || 'VENDOR';

  const targetDashboard = userRole === 'VENDOR' ? '/dashboard/vendor' : '/dashboard/owner';

  const portalName = userRole === 'VENDOR' ? 'Vendor Portal' : 'Platform Owner Console';

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
        setLoading(false);
      } else {
        // Update NextAuth session state
        await update({ mfaEnabled: true, mfaVerified: true, mfaSecret: secret });
        setSuccess(`Two-factor authentication is now active.`);
        setLoading(false);

        // Seamless auto-redirect to role dashboard after 1.5s. A hard navigation
        // (not router.push) is deliberate: middleware gates every /dashboard route
        // on mfaVerified, and Next's client Router Cache can have a stale "bounce
        // back to mfa-enrol" response cached from before this session was verified
        // (e.g. a prefetched sidebar link) — only a full reload guarantees the
        // freshly-updated session cookie is what middleware evaluates next.
        setTimeout(() => {
          window.location.href = targetDashboard;
        }, 1500);
      }
    } catch (e: any) {
      setError('Error verifying your code.');
      setLoading(false);
    }
  };

  const isEnrolled = Boolean((session?.user as any)?.mfaSecret || ((session?.user as any)?.mfaEnabled && (session?.user as any)?.mfaSecret));

  return (
    <div className="max-w-2xl mx-auto space-y-6 font-sans">
      {isMandatory && (
        <div className="p-4 rounded-2xl border flex items-start gap-3" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: '#991b1b' }} />
          <div className="text-xs">
            <div className="font-extrabold uppercase tracking-wider mb-1">MFA enrolment required</div>
            <p>Your role ({userRole}) requires multi-factor authentication before you can access commercial or financial modules. Complete pairing below to continue.</p>
          </div>
        </div>
      )}
      <div className="p-8 rounded-3xl bg-white border shadow-sm flex items-center justify-between gap-4" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl shrink-0" style={{ background: '#EEF0FE', border: '1px solid #D9D4FB' }}>
            <Lock className="w-8 h-8" style={{ color: '#4C3AE3' }} />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold" style={{ color: '#0f172a' }}>Two-Factor Authentication Setup</h1>
            <p className="text-xs font-mono" style={{ color: '#64748b' }}>Secure your account with an authenticator app</p>
          </div>
        </div>

        <Link
          href={targetDashboard}
          prefetch={false}
          className="px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-1.5 shrink-0"
          style={{ background: '#4C3AE3', color: '#fff' }}
        >
          <span>Open {portalName}</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <div className="p-8 rounded-3xl bg-white border shadow-sm space-y-6" style={{ borderColor: '#e2e8f0' }}>
        <div className="flex items-center justify-between border-b pb-4" style={{ borderColor: '#f1f5f9' }}>
          <div>
            <div className="text-sm font-bold flex items-center gap-2" style={{ color: '#0f172a' }}>
              <ShieldCheck className="w-4 h-4" style={{ color: '#4C3AE3' }} /> Account Security Status
            </div>
            <div className="text-xs mt-0.5 font-mono" style={{ color: '#64748b' }}>Account: {session?.user?.email}</div>
          </div>
          <span className="px-3 py-1 rounded-full text-xs font-bold font-mono border" style={{ background: '#EEF0FE', color: '#4C3AE3', borderColor: '#D9D4FB' }}>
            Role: {userRole}
          </span>
        </div>

        {!isEnrolled && !success && (
          <div className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2" style={{ background: '#fefce8', borderColor: '#fde68a', color: '#854d0e' }}>
            <AlertCircle className="w-4 h-4 shrink-0" style={{ color: '#854d0e' }} />
            <span>
              <strong>Mandatory Security Requirement:</strong> Your account requires Multi-Factor Authentication (2FA) setup. Please complete the enrolment steps below to unlock full dashboard features.
            </span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-2xl border text-xs font-semibold flex items-center gap-2" style={{ background: '#fef2f2', borderColor: '#fecaca', color: '#991b1b' }}>
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="p-5 rounded-2xl border text-xs font-semibold space-y-3" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', color: '#166534' }}>
            <div className="flex items-center gap-2 font-bold text-sm" style={{ color: '#166534' }}>
              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: '#166534' }} />
              <span>{success}</span>
            </div>
            <p className="text-xs" style={{ color: '#166534' }}>Redirecting to {portalName} in a moment...</p>
            <div className="pt-1">
              <Link
                href={targetDashboard}
                prefetch={false}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all"
                style={{ background: '#4C3AE3', color: '#fff' }}
              >
                <span>Launch {portalName} Now</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {(session?.user as any)?.mfaEnabled && !success ? (
          <div className="text-center py-8 space-y-5 rounded-2xl border p-6" style={{ background: '#f0fdf4', borderColor: '#bbf7d0' }}>
            <div className="w-12 h-12 rounded-2xl border flex items-center justify-center mx-auto" style={{ background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: '#0f172a' }}>Two-Factor Authentication is Active</h2>
              <p className="text-xs max-w-md mx-auto mt-1" style={{ color: '#64748b' }}>
                Your account is protected with Two-Factor Authentication. Re-configuration is locked to prevent unauthorized tampering.
              </p>
            </div>
            <div className="inline-block px-3.5 py-1 rounded-full text-[11px] font-mono font-bold border" style={{ background: '#dcfce7', color: '#166534', borderColor: '#bbf7d0' }}>
              Status: Enrollment Locked
            </div>

            <div className="pt-3">
              <Link
                href={targetDashboard}
                prefetch={false}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs shadow-md transition-all"
                style={{ background: '#4C3AE3', color: '#fff' }}
              >
                <span>Proceed to {portalName}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        ) : !qrCodeUrl ? (
          <div className="text-center py-6 space-y-4">
            <p className="text-xs max-w-md mx-auto leading-relaxed" style={{ color: '#64748b' }}>
              Secure your account using Google Authenticator, Microsoft Authenticator, or Authy. Click below to generate your 2FA setup QR Code.
            </p>
            <Button onClick={handleStartSetup} isLoading={loading} style={{ background: '#4C3AE3', color: '#fff' }}>
              Generate 2FA Setup QR Code
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-center gap-6 p-5 rounded-2xl border" style={{ background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <div className="bg-white p-2 rounded-xl border shrink-0" style={{ borderColor: '#e2e8f0' }}>
                <img src={qrCodeUrl} alt="MFA QR Code" className="w-36 h-36" />
              </div>
              <div className="space-y-2 text-xs">
                <div className="font-bold uppercase tracking-wider text-[11px]" style={{ color: '#4C3AE3' }}>
                  Step 1: Scan with Authenticator App
                </div>
                <p className="leading-relaxed" style={{ color: '#64748b' }}>
                  Scan this QR code using Google Authenticator or Microsoft Authenticator app on your phone.
                </p>
                <div className="pt-1 font-mono text-[11px]" style={{ color: '#475569' }}>
                  Secret Key: <span className="bg-white px-2 py-0.5 rounded border font-bold select-all" style={{ color: '#4C3AE3', borderColor: '#e2e8f0' }}>{secret}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <Input
                label="Step 2: Enter the 6-digit code from your app"
                maxLength={6}
                required
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="e.g. 123456"
              />

              <Button type="submit" variant="success" className="w-full" isLoading={loading} style={{ background: '#4C3AE3', color: '#fff' }}>
                Verify &amp; Complete Setup
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
