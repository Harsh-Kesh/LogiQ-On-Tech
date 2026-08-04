"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";

interface DemoAccount {
  id: string;
  role: string;
  badge: string;
  email: string;
  password: string;
  portalUrl: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "owner",
    role: "Platform Owner",
    badge: "Owner Portal",
    email: "owner@logiqon.com",
    password: "Password123!",
    portalUrl: "/dashboard/owner",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    icon: "👑",
  },
  {
    id: "vendor",
    role: "Vendor",
    badge: "Vendor Portal",
    email: "vendor@logiqon.com",
    password: "Password123!",
    portalUrl: "/dashboard/vendor",
    color: "#0d9488",
    bgColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    icon: "🏭",
  },
  {
    id: "warehouse",
    role: "Warehouse Manager",
    badge: "Warehouse Portal",
    email: "warehouse@logiqon.com",
    password: "Password123!",
    portalUrl: "/dashboard/warehouse",
    color: "#ea580c",
    bgColor: "#fff7ed",
    borderColor: "#ffedd5",
    icon: "📦",
  },
  {
    id: "customer",
    role: "Customer",
    badge: "Customer Portal",
    email: "customer@logiqon.com",
    password: "Password123!",
    portalUrl: "/dashboard/customer",
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    icon: "👤",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (res?.error) {
        setErrorMsg(res.error);
        setLoading(false);
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      setErrorMsg("An unexpected authentication error occurred.");
      setLoading(false);
    }
  }

  function handleQuickLogin(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
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
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to home
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

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              margin: "32px 0",
            }}
          >
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
                  boxShadow: "0 10px 25px -5px rgba(15, 23, 42, 0.12)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#0f172a" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  <path d="M9 12l2 2 4-4" />
                </svg>
              </div>

              <div style={{ position: "absolute", top: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📦</div>
              <div style={{ position: "absolute", right: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>🌐</div>
              <div style={{ position: "absolute", bottom: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📊</div>
              <div style={{ position: "absolute", left: -8, width: 28, height: 28, borderRadius: "50%", background: "#ffffff", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>⚡</div>
            </div>

            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              One Secure Account.
            </h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.55, color: "#64748b", maxWidth: 290, margin: 0 }}>
              Access logistics telemetry, order tracking, verified vendor services, and enterprise analytics instantly.
            </p>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            © 2026 LogiQ-On Ecosystem. All rights reserved.
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div style={{ padding: "42px 44px", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#ffffff" }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                  Welcome back
                </h1>
              </div>

              <div style={{ display: "inline-flex", background: "#f1f5f9", padding: 4, borderRadius: 20, marginLeft: "auto" }}>
                <button
                  type="button"
                  style={{ padding: "6px 14px", borderRadius: 16, fontSize: 12.5, fontWeight: 700, border: "none", background: "#0f172a", color: "#ffffff", cursor: "pointer" }}
                >
                  Sign In
                </button>
                <Link
                  href="/auth/register"
                  style={{ padding: "6px 14px", borderRadius: 16, fontSize: 12.5, fontWeight: 600, color: "#64748b", textDecoration: "none" }}
                >
                  Register
                </Link>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 20px 0" }}>
              Enter your credentials to access your multi-tenant portal console.
            </p>

            {/* Error Message Alert */}
            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Quick Fill Demo Credentials */}
            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 14, padding: "12px 14px", marginBottom: 22 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#334155" }}>
                  🔑 Quick Fill Demo Accounts:
                </span>
                <button
                  type="button"
                  onClick={() => setShowDemoDrawer(!showDemoDrawer)}
                  style={{ fontSize: 11.5, fontWeight: 600, color: "#2563eb", background: "none", border: "none", cursor: "pointer" }}
                >
                  {showDemoDrawer ? "Hide ▲" : "Details ▾"}
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    style={{
                      background: email === acc.email ? acc.bgColor : "#ffffff",
                      border: `1px solid ${email === acc.email ? acc.borderColor : "#cbd5e1"}`,
                      color: email === acc.email ? acc.color : "#334155",
                      padding: "4px 10px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    <span>{acc.icon}</span> {acc.role}
                  </button>
                ))}
              </div>

              {showDemoDrawer && (
                <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px dashed #cbd5e1", fontSize: 11, color: "#64748b" }}>
                  Password for all demo accounts: <code style={{ fontWeight: 700, color: "#0f172a" }}>Password123!</code>
                </div>
              )}
            </div>

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="owner@logiqon.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", fontSize: 14.5, color: "#0f172a", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 6 }}>
                  Password
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{ width: "100%", padding: "12px 42px 12px 14px", fontSize: 14.5, color: "#0f172a", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#94a3b8", cursor: "pointer" }}
                  >
                    {showPassword ? "👁️" : "🙈"}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ accentColor: "#0f172a" }}
                />
                <label htmlFor="remember" style={{ fontSize: 13.5, color: "#475569", cursor: "pointer" }}>
                  Keep me signed in
                </label>
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
                  boxShadow: "0 4px 14px rgba(15, 23, 42, 0.15)",
                  marginTop: 6,
                }}
              >
                {loading ? "Authenticating..." : "Sign In →"}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
