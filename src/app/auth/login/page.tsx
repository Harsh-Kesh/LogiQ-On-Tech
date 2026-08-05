"use client";

import { useState, type FormEvent } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";
import { Eye, EyeOff, Shield, Building, Warehouse, ShoppingCart, Lock } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const presetAccounts = [
    {
      role: "PLATFORM_OWNER",
      label: "Platform Owner / Admin",
      email: "owner@logiqon.com",
      password: "Password123!",
      desc: "Full executive access, user directory & audit log management",
      icon: Shield,
      badgeColor: "#1e3a8a",
    },
    {
      role: "VENDOR",
      label: "Apex Hardware (Vendor)",
      email: "vendor@logiqon.com",
      password: "Password123!",
      desc: "Statutory ATO compliance, product catalog & 3PL allocations",
      icon: Building,
      badgeColor: "#d97706",
    },
    {
      role: "WAREHOUSE",
      label: "Sydney Hub (Warehouse)",
      email: "warehouse@logiqon.com",
      password: "Password123!",
      desc: "Stock ledger, bin management & 3PL order fulfillment",
      icon: Warehouse,
      badgeColor: "#0284c7",
    },
    {
      role: "CUSTOMER",
      label: "Retail Buyers (Customer)",
      email: "customer@logiqon.com",
      password: "Password123!",
      desc: "Equipment procurement, order checkout & shipment tracking",
      icon: ShoppingCart,
      badgeColor: "#16a34a",
    },
  ];

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
        const sessionRes = await fetch("/api/auth/role");
        if (sessionRes.ok) {
          const data = await sessionRes.json();
          if (data.mfaEnabled && !data.mfaVerified) {
            router.push("/auth/mfa-verify");
            return;
          }
        }
        router.push("/dashboard");
      } else {
        setErrorMsg("Invalid email or password. Please check your credentials.");
        setLoading(false);
      }
    } catch {
      setErrorMsg("Network error during authentication.");
      setLoading(false);
    }
  }

  function handleSelectPreset(account: (typeof presetAccounts)[0]) {
    setEmail(account.email);
    setPassword(account.password);
    setErrorMsg("");
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
          maxWidth: 1080,
          background: "#ffffff",
          borderRadius: 28,
          boxShadow: "0 25px 70px -15px rgba(15, 23, 42, 0.08)",
          display: "grid",
          gridTemplateColumns: "48% 52%",
          overflow: "hidden",
        }}
      >
        {/* Left Side: Staging Presets Panel */}
        <div
          style={{
            background: "#f8fafc",
            borderRight: "1px solid #e2e8f0",
            padding: "40px 36px",
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
                marginBottom: 28,
              }}
            >
              ← Back to home
            </Link>

            <div style={{ marginBottom: 20 }}>
              <Image
                src={getAssetPath("/images/logo.png")}
                alt="LogiQ-On Logo"
                width={140}
                height={40}
                style={{ height: 40, width: "auto", objectFit: "contain" }}
                priority
              />
            </div>

            <h2 style={{ fontSize: 20, fontWeight: 800, color: "#0f172a", marginBottom: 4 }}>
              Staging Portal Accounts
            </h2>
            <p style={{ fontSize: 13, color: "#64748b", marginBottom: 20 }}>
              Click any role card below to instant-fill test credentials:
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {presetAccounts.map((acc) => {
                const Icon = acc.icon;
                const isSelected = email === acc.email;

                return (
                  <button
                    key={acc.role}
                    type="button"
                    onClick={() => handleSelectPreset(acc)}
                    style={{
                      textAlign: "left",
                      padding: "14px 16px",
                      borderRadius: 16,
                      background: isSelected ? "#ffffff" : "#ffffff",
                      border: isSelected ? "2px solid #0f172a" : "1px solid #e2e8f0",
                      boxShadow: isSelected ? "0 4px 12px rgba(15, 23, 42, 0.08)" : "0 1px 3px rgba(0,0,0,0.02)",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        padding: 8,
                        borderRadius: 10,
                        background: "#f1f5f9",
                        color: acc.badgeColor,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <Icon className="w-5 h-5" />
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 2 }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "#0f172a" }}>
                          {acc.label}
                        </span>
                        <span
                          style={{
                            fontSize: 10,
                            fontFamily: "monospace",
                            fontWeight: 700,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "#f1f5f9",
                            color: "#475569",
                          }}
                        >
                          {acc.role}
                        </span>
                      </div>
                      <p style={{ fontSize: 12, color: "#64748b", margin: 0, lineHeight: 1.4 }}>
                        {acc.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 24 }}>
            ⚡ <strong>Staging OTP Code:</strong> Use <code style={{ color: "#0f172a", fontWeight: "bold" }}>123456</code> to bypass TOTP authenticator device check.
          </div>
        </div>

        {/* Right Side: Login Form */}
        <div style={{ padding: "42px 44px", background: "#ffffff", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 6 }}>
              <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0 }}>
                Sign In
              </h1>

              <div style={{ display: "inline-flex", background: "#f1f5f9", padding: 4, borderRadius: 20 }}>
                <button
                  type="button"
                  style={{ padding: "6px 14px", borderRadius: 16, fontSize: 12.5, fontWeight: 700, border: "none", background: "#0f172a", color: "#ffffff" }}
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

            <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 24px 0" }}>
              Enter your credentials to access your role dashboard.
            </p>

            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

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
                    style={{
                      position: "absolute",
                      right: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      background: "none",
                      border: "none",
                      color: "#64748b",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: 0,
                    }}
                    title={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 13 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, color: "#475569", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{ borderRadius: 4 }}
                  />
                  Remember session
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
                  padding: "14px",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "#ffffff",
                  background: "#0f172a",
                  borderRadius: 12,
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                  marginTop: 8,
                }}
              >
                {loading ? "Authenticating..." : "Sign In to Dashboard →"}
              </button>
            </form>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8", textAlign: "center", borderTop: "1px solid #f1f5f9", paddingTop: 16, marginTop: 24 }}>
            LogiQ-On Platform Governance • Multi-tenant RBAC &amp; ATO Compliance
          </div>
        </div>
      </div>
    </div>
  );
}
