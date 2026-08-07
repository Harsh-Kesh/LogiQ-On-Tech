"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getAssetPath } from "@/lib/nav";
import { Eye, EyeOff } from "lucide-react";

export default function RegisterView() {
  const router = useRouter();
  const [role, setRole] = useState("VENDOR");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setErrorMsg("Please agree to the Terms of Service to continue.");
      return;
    }

    setLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, fullName, role, password }),
      });

      if (res.ok) {
        setSubmitted(true);
        setTimeout(() => {
          router.push("/auth/login?registered=true");
        }, 1200);
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
          boxShadow: "0 25px 70px -15px rgba(15, 23, 42, 0.08), 0 0 1px rgba(15, 23, 42, 0.12)",
          display: "grid",
          gridTemplateColumns: "44% 56%",
          overflow: "hidden",
        }}
        className="register-container-grid"
      >
        {/* Left Side: Deep Blue Gradient Banner */}
        <div
          style={{
            background: "linear-gradient(135deg, #1e3a8a 0%, #2563eb 50%, #1d4ed8 100%)",
            padding: "50px 45px",
            color: "#ffffff",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Subtle Background Pattern Arcs */}
          <svg
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "100%",
              height: "100%",
              opacity: 0.15,
              pointerEvents: "none",
            }}
            viewBox="0 0 500 500"
            fill="none"
          >
            <circle cx="450" cy="100" r="300" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="450" cy="100" r="230" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="450" cy="100" r="160" stroke="#ffffff" strokeWidth="1.5" />
            <circle cx="450" cy="100" r="90" stroke="#ffffff" strokeWidth="1.5" />
          </svg>

          {/* Top Spark Icon */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <svg width="48" height="48" viewBox="0 0 40 40" fill="none">
              <path
                d="M20 2v36M2 20h36M7.27 7.27l25.46 25.46M7.27 32.73L32.73 7.27"
                stroke="#ffffff"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Center Content */}
          <div style={{ position: "relative", zIndex: 1, margin: "40px 0" }}>
            <h1
              style={{
                fontSize: 42,
                fontWeight: 800,
                lineHeight: 1.15,
                color: "#ffffff",
                letterSpacing: "-0.02em",
                marginBottom: 20,
              }}
            >
              Join LogiQ-On! <span role="img" aria-label="rocket">🚀</span>
            </h1>
            <p
              style={{
                fontSize: 15.5,
                lineHeight: 1.6,
                color: "rgba(255, 255, 255, 0.88)",
                maxWidth: 420,
                marginBottom: 24,
              }}
            >
              Create your account to access multi-tenant logistics &amp; vendor governance portals.
            </p>

            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "flex",
                flexDirection: "column",
                gap: 12,
                fontSize: 14,
                color: "rgba(255, 255, 255, 0.95)",
              }}
            >
              <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Statutory ATO compliance &amp; document auditing
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Unified multi-tenant role access control (RBAC)
              </li>
              <li style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#60a5fa" strokeWidth="2.5">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
                Dedicated support from supply chain hardware specialists
              </li>
            </ul>
          </div>

          {/* Bottom Copyright */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              fontSize: 13,
              color: "rgba(255, 255, 255, 0.7)",
            }}
          >
            © 2026 LogiQ-On Technology Group Pty Ltd.
          </div>
        </div>

        {/* Right Side: Form Container */}
        <div
          style={{
            padding: "40px 45px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: "#ffffff",
            overflowY: "auto",
          }}
        >
          <div>
            {/* Logo */}
            <div style={{ marginBottom: 28 }}>
              <Link href="/">
                <Image
                  src={getAssetPath("/images/logo.png")}
                  alt="LogiQ-On Logo"
                  width={150}
                  height={42}
                  style={{ height: 42, width: "auto", objectFit: "contain" }}
                  priority
                />
              </Link>
            </div>

            {/* Title & Subtitle */}
            <h2
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: "#0f172a",
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}
            >
              Create New Account
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748b", marginBottom: 20 }}>
              Already have an account?{" "}
              <Link
                href="/auth/login"
                style={{
                  color: "#0f172a",
                  fontWeight: 600,
                  textDecoration: "underline",
                }}
              >
                Log in here
              </Link>
            </p>

            {errorMsg && (
              <div style={{ background: "#fef2f2", border: "1px solid #fecaca", color: "#991b1b", padding: "10px 14px", borderRadius: 12, fontSize: 13, fontWeight: 600, marginBottom: 16 }}>
                ⚠️ {errorMsg}
              </div>
            )}

            {/* Account Role Selector Pills */}
            <div
              style={{
                display: "inline-flex",
                background: "#f1f5f9",
                padding: 4,
                borderRadius: 10,
                marginBottom: 20,
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={() => setRole("VENDOR")}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  background: role === "VENDOR" ? "#ffffff" : "transparent",
                  color: role === "VENDOR" ? "#0f172a" : "#64748b",
                  boxShadow: role === "VENDOR" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                }}
              >
                Vendor / Supplier
              </button>
              <button
                type="button"
                onClick={() => setRole("WAREHOUSE")}
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 7,
                  fontSize: 12.5,
                  fontWeight: 600,
                  border: "none",
                  background: role === "WAREHOUSE" ? "#ffffff" : "transparent",
                  color: role === "WAREHOUSE" ? "#0f172a" : "#64748b",
                  boxShadow: role === "WAREHOUSE" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
                  cursor: "pointer",
                }}
              >
                Warehouse Operator
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 4px",
                    fontSize: 14.5,
                    color: "#0f172a",
                    border: "none",
                    borderBottom: "2px solid #e2e8f0",
                    background: "transparent",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0f172a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              <div>
                <input
                  type="email"
                  required
                  placeholder="Email Address (e.g. user@company.com.au)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 4px",
                    fontSize: 14.5,
                    color: "#0f172a",
                    border: "none",
                    borderBottom: "2px solid #e2e8f0",
                    background: "transparent",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0f172a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
              </div>

              {/* Password Field with Eye Icon */}
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Create Password (min. 8 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 36px 12px 4px",
                    fontSize: 14.5,
                    color: "#0f172a",
                    border: "none",
                    borderBottom: "2px solid #e2e8f0",
                    background: "transparent",
                    outline: "none",
                  }}
                  onFocus={(e) => (e.target.style.borderColor = "#0f172a")}
                  onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 4,
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

              {/* Checkbox */}
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b", marginTop: 4 }}>
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                  style={{ borderRadius: 4 }}
                />
                I agree to the <Link href="#" style={{ color: "#0f172a", textDecoration: "underline" }}>Terms of Service</Link> &amp; <Link href="#" style={{ color: "#0f172a", textDecoration: "underline" }}>Privacy Policy</Link>
              </label>

              {/* Primary Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 10,
                  background: "#18181b",
                  color: "#ffffff",
                  fontSize: 15,
                  fontWeight: 600,
                  border: "none",
                  cursor: loading ? "wait" : "pointer",
                  marginTop: 6,
                  transition: "background 0.2s ease",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onMouseOver={(e) => (e.currentTarget.style.background = "#27272a")}
                onMouseOut={(e) => (e.currentTarget.style.background = "#18181b")}
              >
                {loading ? "Creating Account..." : "Create Account Now"}
              </button>

              {submitted && (
                <div
                  style={{
                    padding: 12,
                    borderRadius: 8,
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
                  Account created successfully! Redirecting to login...
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
