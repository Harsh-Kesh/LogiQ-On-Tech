"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";
import { Eye, EyeOff, Shield, Building, Warehouse, ShoppingCart } from "lucide-react";

interface DemoAccount {
  id: string;
  role: string;
  badge: string;
  email: string;
  password: string;
  portalName: string;
  portalUrl: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
  description: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "owner",
    role: "Platform Owner",
    badge: "Owner Console",
    email: "owner@logiqon.com",
    password: "Password123!",
    portalName: "Platform Owner Console",
    portalUrl: "/dashboard/owner",
    color: "#1e3a8a",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    icon: "👑",
    description: "Executive analytics, commercial order management & user directory",
  },
  {
    id: "vendor_apex",
    role: "Vendor: Apex Hardware",
    badge: "Vendor Portal",
    email: "vendor@logiqon.tech",
    password: "Password123!",
    portalName: "Vendor Portal",
    portalUrl: "/dashboard/vendor",
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fef3c7",
    icon: "🏭",
    description: "Hardware catalog (Scanners, RFID) & warehouse stock fulfillment",
  },
  {
    id: "vendor_smith",
    role: "Vendor: Smith Logistics",
    badge: "Vendor Portal",
    email: "john@smithlogistics.com",
    password: "Password123!",
    portalName: "Vendor Portal",
    portalUrl: "/dashboard/vendor",
    color: "#059669",
    bgColor: "#ecfdf5",
    borderColor: "#a7f3d0",
    icon: "📦",
    description: "Freight & logistics catalog & warehouse stock fulfillment",
  },
  {
    id: "vendor_jonathan",
    role: "Vendor: Jonathan Logistics Hub",
    badge: "Vendor Portal",
    email: "jon.doe@vendor.logiqon.com",
    password: "Password123!",
    portalName: "Vendor Portal",
    portalUrl: "/dashboard/vendor",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    icon: "🚚",
    description: "Logistics catalog & warehouse stock fulfillment",
  },
];

export default function LoginView() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });

      if (res?.ok) {
        // Fetch session to check MFA status
        const sessionRes = await fetch("/api/auth/session");
        if (sessionRes.ok) {
          const session = await sessionRes.json();
          if (session?.user?.mfaEnabled && !session?.user?.mfaVerified) {
            router.push("/auth/mfa-verify");
            return;
          }
        }
        router.push("/dashboard");
      } else {
        const customError = res?.error && res.error !== "CredentialsSignin"
          ? res.error
          : "Invalid email or password. Please check your credentials.";
        setErrorMsg(customError);
        setLoading(false);
      }
    } catch {
      setErrorMsg("Network error during authentication.");
      setLoading(false);
    }
  }

  function handleQuickLogin(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedField(label);
    setTimeout(() => setCopiedField(null), 2000);
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
          maxWidth: 1040,
          background: "#ffffff",
          borderRadius: 28,
          boxShadow: "0 25px 70px -15px rgba(15, 23, 42, 0.08), 0 0 1px rgba(15, 23, 42, 0.12)",
          display: "grid",
          gridTemplateColumns: "44% 56%",
          overflow: "hidden",
        }}
        className="login-container-grid"
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
            position: "relative",
          }}
        >
          {/* Back to Home & Logo */}
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
                transition: "color 0.2s ease",
              }}
              className="hover:text-slate-900"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to home
            </Link>

            <div>
              <Image
                src={getAssetPath("/images/logo.png")}
                alt="LogiQ-On Logo"
                width={130}
                height={36}
                style={{ height: 36, width: "auto", objectFit: "contain" }}
                priority
              />
            </div>
          </div>

          {/* Central Graphic Illustration */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              margin: "32px 0",
            }}
          >
            {/* Concentric Circle Badge Graphic */}
            <div
              style={{
                position: "relative",
                width: 170,
                height: 170,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 28,
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "1.5px dashed #cbd5e1",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  inset: 18,
                  borderRadius: "50%",
                  background: "#f1f5f9",
                }}
              />

              <div
                style={{
                  position: "relative",
                  zIndex: 2,
                  width: 58,
                  height: 58,
                  borderRadius: 16,
                  background: "#ffffff",
                  boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12), 0 0 1px rgba(0, 0, 0, 0.08)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>

              {/* Satellite Node Icons */}
              <div style={{ position: "absolute", top: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📦</div>
              <div style={{ position: "absolute", right: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🌐</div>
              <div style={{ position: "absolute", bottom: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📊</div>
              <div style={{ position: "absolute", left: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", boxShadow: "0 2px 6px rgba(0,0,0,0.06)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚡</div>
            </div>

            <h2
              style={{
                fontSize: 24,
                fontWeight: 800,
                color: "#0f172a",
                letterSpacing: "-0.02em",
                marginBottom: 8,
              }}
            >
              One Secure Account.
            </h2>
            <p
              style={{
                fontSize: 13.5,
                lineHeight: 1.55,
                color: "#64748b",
                maxWidth: 290,
                margin: 0,
              }}
            >
              Access order tracking, dispatch &amp; inventory visibility, verified vendor services, and enterprise analytics instantly.
            </p>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            © 2026 LogiQ-On Ecosystem. All rights reserved.
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div
          style={{
            padding: "42px 44px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#ffffff",
          }}
        >
          <div>
            <div style={{ marginBottom: 6 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", letterSpacing: "-0.02em", margin: 0 }}>
                Sign In to LogiQ-On
              </h1>
            </div>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 20px 0" }}>
              Enter your details to sign in to your account.
            </p>

            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Client Demo Accounts Quick Selector */}
            <div
              style={{
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "12px 14px",
                marginBottom: 22,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "flex", alignItems: "center", gap: 5 }}>
                  <span>🔑</span> Quick Access Credentials:
                </span>
                <button
                  type="button"
                  onClick={() => setShowDemoDrawer((v) => !v)}
                  style={{ fontSize: 11.5, fontWeight: 600, color: "#2563eb", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  {showDemoDrawer ? "Hide Details ▲" : "View Details ▾"}
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    title={`Fill credentials for ${acc.role}`}
                    style={{
                      background: email === acc.email ? acc.bgColor : "#ffffff",
                      border: `1px solid ${email === acc.email ? acc.borderColor : "#cbd5e1"}`,
                      color: email === acc.email ? acc.color : "#334155",
                      padding: "4px 9px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>{acc.icon}</span>
                    <span>{acc.role}</span>
                  </button>
                ))}
              </div>

              {showDemoDrawer && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px dashed #cbd5e1", display: "flex", flexDirection: "column", gap: 6 }}>
                  {DEMO_ACCOUNTS.map((acc) => (
                    <div
                      key={acc.id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontSize: 11.5,
                        background: "#ffffff",
                        padding: "6px 10px",
                        borderRadius: 8,
                        border: "1px solid #e2e8f0",
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontWeight: 700, color: "#0f172a" }}>{acc.role}:</span>
                        <span style={{ fontFamily: "monospace", color: "#475569" }}>
                          {acc.email} | {acc.password}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopy(`${acc.email} / ${acc.password}`, acc.id)}
                        style={{ fontSize: 10.5, color: "#64748b", background: "#f1f5f9", border: "none", borderRadius: 4, padding: "2px 6px", cursor: "pointer" }}
                      >
                        {copiedField === acc.id ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Email Address
                </label>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: 14, color: "#94a3b8", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="owner@logiqon.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px 12px 42px", fontSize: 14.5, color: "#0f172a", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" }}
                  />
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyItems: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "#334155", margin: 0 }}>
                    Password
                  </label>
                </div>
                <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
                  <span style={{ position: "absolute", left: 14, color: "#94a3b8", display: "flex", alignItems: "center", pointerEvents: "none" }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", padding: "12px 42px 12px 42px", fontSize: 14.5, color: "#0f172a", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{ position: "absolute", right: 14, background: "none", border: "none", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", padding: 0 }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", cursor: "pointer" }}>
                  <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} style={{ borderRadius: 4 }} />
                  Keep me signed in
                </label>

                <Link href="/auth/forgot-password" style={{ color: "#2563eb", fontWeight: 600, textDecoration: "none" }}>
                  Forgot password?
                </Link>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 14,
                  background: "#09090b",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                  marginTop: 4,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>{loading ? "Authenticating..." : "Sign In"}</span>
                <span style={{ fontSize: 16 }}>➔</span>
              </button>
            </form>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 16, marginTop: 24 }}>
            Secure Access for Owners, Vendors &amp; Warehouse Teams • ATO Compliant
          </div>
        </div>
      </div>
    </div>
  );
}
