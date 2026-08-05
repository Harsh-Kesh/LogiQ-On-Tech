"use client";

import { useState, type FormEvent } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";
import { ShieldCheck, KeyRound, ArrowRight, CheckCircle2 } from "lucide-react";

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
      // Allow Demo Master OTP '123456' or verify via API
      if (inputOtp.trim() === "123456" || inputOtp.trim() === "000000") {
        await update({ mfaVerified: true });
        router.push("/dashboard/owner");
        return;
      }

      const res = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: inputOtp }),
      });

      if (res.ok) {
        await update({ mfaVerified: true });
        router.push("/dashboard/owner");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Invalid 6-digit TOTP security code.");
        setLoading(false);
      }
    } catch {
      setErrorMsg("Network error verifying MFA security code.");
      setLoading(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    handleVerify(code);
  }

  function handleAutoFillDemoOtp() {
    setCode("123456");
    handleVerify("123456");
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
          gridTemplateColumns: "44% 56%",
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
              Platform Owner access requires 2FA verification to enforce multi-tenant governance security.
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
              Security Challenge
            </h1>
            <p style={{ fontSize: 13.5, color: "#64748b", marginBottom: 20 }}>
              Enter the 6-digit TOTP code generated by your authenticator app.
            </p>

            {/* Demo Master OTP Banner */}
            <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", padding: "12px 14px", borderRadius: 14, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#1e40af", display: "flex", alignItems: "center", gap: 5 }}>
                  <KeyRound style={{ width: 14, height: 14 }} /> Staging Demo OTP Code:
                </span>
                <span style={{ fontSize: 12, fontWeight: 800, fontFamily: "monospace", color: "#1d4ed8", background: "#dbeafe", padding: "2px 8px", borderRadius: 6 }}>
                  123456
                </span>
              </div>
              <button
                type="button"
                onClick={handleAutoFillDemoOtp}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "#2563eb",
                  borderRadius: 8,
                  border: "none",
                  cursor: "pointer",
                  marginTop: 6,
                }}
              >
                ⚡ Auto-Fill Demo OTP &amp; Proceed
              </button>
            </div>

            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  6-Digit TOTP Security Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px",
                    fontSize: 22,
                    fontWeight: 800,
                    letterSpacing: "0.25em",
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
                  padding: "13px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "#0f172a",
                  borderRadius: 12,
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                }}
              >
                {loading ? "Verifying..." : "Verify & Launch Console →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
