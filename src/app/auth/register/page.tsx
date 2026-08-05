"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("VENDOR");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, role, password }),
      });

      if (res.ok) {
        router.push("/auth/login?registered=true");
      } else {
        const data = await res.json();
        setErrorMsg(data.error || "Registration failed.");
        setLoading(false);
      }
    } catch {
      setErrorMsg("Network error during registration.");
      setLoading(false);
    }
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
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Join the Network
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748b", margin: 0 }}>
              Create your account to access multi-tenant logistics &amp; vendor portals.
            </p>
          </div>

          <div style={{ fontSize: 12, color: "#94a3b8" }}>
            © 2026 LogiQ-On Ecosystem. All rights reserved.
          </div>
        </div>

        {/* Right Side Form Panel */}
        <div style={{ padding: "42px 44px", background: "#ffffff" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyItems: "space-between", marginBottom: 6 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0f172a", margin: 0 }}>
              Register Account
            </h1>

            <div style={{ display: "inline-flex", background: "#f1f5f9", padding: 4, borderRadius: 20 }}>
              <Link
                href="/auth/login"
                style={{ padding: "6px 14px", borderRadius: 16, fontSize: 12.5, fontWeight: 600, color: "#64748b", textDecoration: "none" }}
              >
                Sign In
              </Link>
              <button
                type="button"
                style={{ padding: "6px 14px", borderRadius: 16, fontSize: 12.5, fontWeight: 700, border: "none", background: "#0f172a", color: "#ffffff" }}
              >
                Register
              </button>
            </div>
          </div>

          <p style={{ fontSize: 13.5, color: "#64748b", margin: "0 0 20px 0" }}>
            Provision a new profile on the LogiQ-On platform.
          </p>

          {errorMsg && (
            <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
              ⚠️ {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="Jane Doe"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", fontSize: 14, color: "#0f172a", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Email Address
              </label>
              <input
                type="email"
                required
                placeholder="jane@logiqon.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", fontSize: 14, color: "#0f172a", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Role Type
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                style={{ width: "100%", padding: "11px 14px", fontSize: 14, color: "#0f172a", borderRadius: 12, border: "1px solid #e2e8f0", background: "#f8fafc", outline: "none" }}
              >
                <option value="VENDOR">Vendor / Supplier</option>
                <option value="WAREHOUSE">Warehouse Manager</option>
                <option value="CUSTOMER">Customer / Retail Buyer</option>
              </select>
            </div>

            {/* Password Field with Eye Toggle */}
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#334155", marginBottom: 4 }}>
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "11px 40px 11px 14px",
                    fontSize: 14,
                    color: "#0f172a",
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    background: "#f8fafc",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 12,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "#64748b",
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                fontSize: 14.5,
                fontWeight: 700,
                color: "#ffffff",
                background: "#0f172a",
                borderRadius: 12,
                border: "none",
                cursor: loading ? "wait" : "pointer",
                marginTop: 8,
              }}
            >
              {loading ? "Creating Account..." : "Complete Registration →"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
