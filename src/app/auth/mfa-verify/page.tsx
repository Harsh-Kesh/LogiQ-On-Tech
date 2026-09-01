"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";
import { ShieldCheck } from "lucide-react";

export default function MFAVerifyPage() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleVerify(inputOtp: string) {
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/mfa/login-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: inputOtp }),
      });

      if (res.ok) {
        await update({ mfaVerified: true });
        
        // Dynamic Role-Based Redirect
        const role = (session?.user as any)?.role || 'VENDOR';
        const targetPath = role === 'VENDOR' ? '/dashboard/vendor' : '/dashboard/owner';

        router.push(targetPath);
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Invalid 6-digit code.");
        setLoading(false);
      }
    } catch {
      setErrorMsg("Network error verifying your code.");
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleVerify(code);
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "36px 20px",
        background: "#f4f6f8",
        fontFamily: "Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 960,
          background: "#ffffff",
          borderRadius: 28,
          boxShadow: "0 25px 70px -15px rgba(15, 23, 42, 0.08)",
          display: "grid",
          gridTemplateColumns: "clamp(0px, 44%, 420px) 1fr",
          overflow: "hidden",
        }}
      >
        {/* Left Side Panel */}
        <div
          style={{
            background: "#f8fafc",
            borderRight: "1px solid #e2e8f0",
            padding: "40px 38px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <Link
              href="/"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                color: "#475569",
                fontSize: 14,
                fontWeight: 600,
                textDecoration: "none",
                marginBottom: 32,
              }}
            >
              ← Back to home
            </Link>

            <div>
              <Image
                src={getAssetPath("/images/logo.png")}
                alt="LogiQ-On Logo"
                width={140}
                height={40}
                style={{ height: 40, width: "auto", objectFit: "contain" }}
                priority
              />
            </div>
          </div>

          <div style={{ textAlign: "center", margin: "32px 0" }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 20,
                background: "#e0e7ff",
                color: "#4338ca",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 20px auto",
              }}
            >
              <ShieldCheck style={{ width: 32, height: 32 }} />
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Two-Factor Protection
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: 0, lineHeight: 1.5 }}>
              Enter the 6-digit code from your Google Authenticator or Microsoft Authenticator app.
            </p>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            © 2026 LogiQ-On Ecosystem. All rights reserved.
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div style={{ padding: "42px 44px", background: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", marginBottom: 6 }}>
              Two-Factor Verification
            </h1>
            <p style={{ fontSize: 13.5, color: "#64748b", marginBottom: 24 }}>
              Enter the 6-digit verification code from your authenticator app.
            </p>

            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 8 }}>
                  6-Digit Verification Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, ''))}
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: 24,
                    fontWeight: 800,
                    letterSpacing: "0.3em",
                    textAlign: "center",
                    color: "#0f172a",
                    borderRadius: 14,
                    border: "2px solid #cbd5e1",
                    background: "#f8fafc",
                    outline: "none",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "#0f172a",
                  borderRadius: 12,
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Verifying..." : "Verify & Continue →"}
              </button>
            </form>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", paddingTop: 16 }}>
            Multi-Factor Authentication • Enterprise-Grade Security
          </div>
        </div>
      </div>
    </div>
  );
}
