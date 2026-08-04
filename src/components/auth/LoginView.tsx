"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";

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
    id: "customer",
    role: "Customer",
    badge: "Customer Portal",
    email: "customer@logiqon.com",
    password: "Customer123!",
    portalName: "Customer Dashboard",
    portalUrl: "/portal/customer",
    color: "#2563eb",
    bgColor: "#eff6ff",
    borderColor: "#bfdbfe",
    icon: "👤",
    description: "Shipment telemetry, tracking & invoices",
  },
  {
    id: "vendor",
    role: "Vendor / Supplier",
    badge: "Vendor Portal",
    email: "vendor@logiqon.com",
    password: "Vendor123!",
    portalName: "Vendor Dashboard",
    portalUrl: "/portal/vendor",
    color: "#0d9488",
    bgColor: "#f0fdf4",
    borderColor: "#bbf7d0",
    icon: "🏭",
    description: "Product catalogs, purchase orders & compliance",
  },
  {
    id: "owner",
    role: "Executive / Admin",
    badge: "Owner Portal",
    email: "owner@logiqon.com",
    password: "Owner123!",
    portalName: "Executive Dashboard",
    portalUrl: "/portal/owner",
    color: "#7c3aed",
    bgColor: "#f5f3ff",
    borderColor: "#ddd6fe",
    icon: "👑",
    description: "Executive analytics, system oversight & admin",
  },
  {
    id: "crm",
    role: "Sales & CRM",
    badge: "CRM Portal",
    email: "crm@logiqon.com",
    password: "Crm123!",
    portalName: "Sales CRM Dashboard",
    portalUrl: "/portal/crm",
    color: "#d97706",
    bgColor: "#fffbeb",
    borderColor: "#fef3c7",
    icon: "📊",
    description: "Client pipelines, lead scoring & sales metrics",
  },
  {
    id: "warehouse",
    role: "Warehouse Manager",
    badge: "Warehouse Portal",
    email: "warehouse@logiqon.com",
    password: "Warehouse123!",
    portalName: "Warehouse Dashboard",
    portalUrl: "/portal/warehouse",
    color: "#ea580c",
    bgColor: "#fff7ed",
    borderColor: "#ffedd5",
    icon: "📦",
    description: "RFID scanning, dock telemetry & stock control",
  },
];

export default function LoginView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"signin" | "register">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [targetPortal, setTargetPortal] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [showDemoDrawer, setShowDemoDrawer] = useState(false);

  function getTargetPortalUrl(inputEmail: string): string {
    const e = inputEmail.toLowerCase();
    if (e.includes("vendor")) return "/portal/vendor";
    if (e.includes("owner") || e.includes("admin")) return "/portal/owner";
    if (e.includes("crm") || e.includes("sales")) return "/portal/crm";
    if (e.includes("warehouse")) return "/portal/warehouse";
    return "/portal/customer";
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const dest = getTargetPortalUrl(email);
    setTargetPortal(dest);
    setSubmitted(true);
    setTimeout(() => {
      router.push(dest);
    }, 700);
  }

  function handleQuickLogin(account: DemoAccount) {
    setEmail(account.email);
    setPassword(account.password);
    setTargetPortal(account.portalUrl);
    setSubmitted(true);
    setTimeout(() => {
      router.push(account.portalUrl);
    }, 600);
  }

  function handleFillCredentials(account: DemoAccount) {
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
              {/* Outer Dashed Orbit Ring */}
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  border: "1.5px dashed #cbd5e1",
                }}
              />
              {/* Inner Soft Circle */}
              <div
                style={{
                  position: "absolute",
                  inset: 18,
                  borderRadius: "50%",
                  background: "#f1f5f9",
                }}
              />

              {/* Central Glowing Shield Icon */}
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
              {/* Top Node */}
              <div
                style={{
                  position: "absolute",
                  top: -8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                📦
              </div>
              {/* Right Node */}
              <div
                style={{
                  position: "absolute",
                  right: -8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                🌐
              </div>
              {/* Bottom Node */}
              <div
                style={{
                  position: "absolute",
                  bottom: -8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                📊
              </div>
              {/* Left Node */}
              <div
                style={{
                  position: "absolute",
                  left: -8,
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 12,
                }}
              >
                ⚡
              </div>
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
              Access logistics telemetry, order tracking, verified vendor services, and enterprise analytics instantly.
            </p>
          </div>

          {/* Left Footer Copyright */}
          <div
            style={{
              fontSize: 12,
              color: "#94a3b8",
            }}
          >
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
            {/* Top Row: Title + Sign In / Register Switcher */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <div>
                <h1
                  style={{
                    fontSize: 28,
                    fontWeight: 800,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                    margin: 0,
                  }}
                >
                  Welcome back
                </h1>
              </div>

              {/* Sign In / Register Pill Switcher */}
              <div
                style={{
                  display: "inline-flex",
                  background: "#f1f5f9",
                  padding: 4,
                  borderRadius: 20,
                }}
              >
                <button
                  type="button"
                  onClick={() => setActiveTab("signin")}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: "none",
                    background: activeTab === "signin" ? "#0f172a" : "transparent",
                    color: activeTab === "signin" ? "#ffffff" : "#64748b",
                    boxShadow: activeTab === "signin" ? "0 2px 5px rgba(15,23,42,0.15)" : "none",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  Sign In
                </button>
                <Link
                  href="/register"
                  style={{
                    padding: "6px 14px",
                    borderRadius: 16,
                    fontSize: 12.5,
                    fontWeight: 600,
                    border: "none",
                    background: "transparent",
                    color: "#64748b",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    transition: "all 0.15s ease",
                  }}
                >
                  Register
                </Link>
              </div>
            </div>

            <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 20px 0" }}>
              Enter your details to sign in to your unified profile.
            </p>

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
                  <span>🔑</span> Client Demo Logins (Click to Sign In):
                </span>
                <button
                  type="button"
                  onClick={() => setShowDemoDrawer((v) => !v)}
                  style={{
                    fontSize: 11.5,
                    fontWeight: 600,
                    color: "#2563eb",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  {showDemoDrawer ? "Hide Passwords ▲" : "View Passwords ▾"}
                </button>
              </div>

              {/* Quick Pills */}
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleQuickLogin(acc)}
                    title={`Quick Login to ${acc.portalName}`}
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
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    <span>{acc.icon}</span>
                    <span>{acc.role}</span>
                  </button>
                ))}
              </div>

              {/* Expandable Demo Accounts Reference Details */}
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
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          onClick={() => handleCopy(`${acc.email} / ${acc.password}`, acc.id)}
                          style={{
                            fontSize: 10.5,
                            color: "#64748b",
                            background: "#f1f5f9",
                            border: "none",
                            borderRadius: 4,
                            padding: "2px 6px",
                            cursor: "pointer",
                          }}
                        >
                          {copiedField === acc.id ? "✓ Copied" : "Copy"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleFillCredentials(acc)}
                          style={{
                            fontSize: 10.5,
                            color: "#2563eb",
                            background: "#eff6ff",
                            border: "none",
                            borderRadius: 4,
                            padding: "2px 6px",
                            fontWeight: 600,
                            cursor: "pointer",
                          }}
                        >
                          Fill Form
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Sign In Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Email Input Field */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#334155",
                    marginBottom: 6,
                  }}
                >
                  Email Address
                </label>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <path d="M22 6l-10 7L2 6" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={{
                      width: "100%",
                      padding: "12px 14px 12px 42px",
                      fontSize: 14.5,
                      color: "#0f172a",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      outline: "none",
                      transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0f172a";
                      e.target.style.background = "#ffffff";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.background = "#f8fafc";
                    }}
                  />
                </div>
              </div>

              {/* Password Input Field */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                  <label
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#334155",
                      margin: 0,
                    }}
                  >
                    Password
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      alert("Password reset instructions have been sent to your email address.");
                    }}
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#334155",
                      textDecoration: "none",
                    }}
                  >
                    Forgot?
                  </a>
                </div>
                <div
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      position: "absolute",
                      left: 14,
                      color: "#94a3b8",
                      display: "flex",
                      alignItems: "center",
                      pointerEvents: "none",
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
                    style={{
                      width: "100%",
                      padding: "12px 42px 12px 42px",
                      fontSize: 14.5,
                      color: "#0f172a",
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      background: "#f8fafc",
                      outline: "none",
                      transition: "all 0.2s ease",
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = "#0f172a";
                      e.target.style.background = "#ffffff";
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = "#e2e8f0";
                      e.target.style.background = "#f8fafc";
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    style={{
                      position: "absolute",
                      right: 14,
                      background: "none",
                      border: "none",
                      color: "#94a3b8",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Keep me signed in Checkbox */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0" }}>
                <input
                  type="checkbox"
                  id="keepSignedIn"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 4,
                    accentColor: "#0f172a",
                    cursor: "pointer",
                  }}
                />
                <label
                  htmlFor="keepSignedIn"
                  style={{
                    fontSize: 13.5,
                    color: "#475569",
                    cursor: "pointer",
                    userSelect: "none",
                  }}
                >
                  Keep me signed in
                </label>
              </div>

              {/* Primary Black Sign In Button */}
              <button
                type="submit"
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 14,
                  background: "#09090b",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  marginTop: 4,
                  transition: "background 0.2s ease, transform 0.1s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#18181b")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#09090b")}
              >
                <span>Sign In</span>
                <span style={{ fontSize: 16 }}>➔</span>
              </button>

              {submitted && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 10,
                    background: "#f0fdf4",
                    border: "1px solid #bbf7d0",
                    color: "#166534",
                    fontSize: 13.5,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                  <span>Signed in successfully! Opening dashboard...</span>
                </div>
              )}
            </form>

            {/* OR CONTINUE WITH Divider */}
            <div
              style={{
                position: "relative",
                textAlign: "center",
                margin: "24px 0 20px 0",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: "50% 0 0 0",
                  borderTop: "1px solid #e2e8f0",
                }}
              />
              <span
                style={{
                  position: "relative",
                  background: "#ffffff",
                  padding: "0 12px",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#94a3b8",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Or continue with
              </span>
            </div>

            {/* Social Login Pill Buttons */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button
                type="button"
                onClick={() => handleQuickLogin(DEMO_ACCOUNTS[0])}
                style={{
                  padding: "11px 16px",
                  borderRadius: 14,
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                Google
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin(DEMO_ACCOUNTS[1])}
                style={{
                  padding: "11px 16px",
                  borderRadius: 14,
                  background: "#ffffff",
                  color: "#334155",
                  fontSize: 13.5,
                  fontWeight: 600,
                  border: "1px solid #e2e8f0",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#f8fafc")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#ffffff")}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0f172a">
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                </svg>
                GitHub
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive Breakdown */}
      <style jsx>{`
        @media (max-width: 868px) {
          .login-container-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
