"use client";

import { useState, type FormEvent } from "react";

export default function LoginForm({ emailPlaceholder }: { emailPlaceholder: string }) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="field">
        <label htmlFor="l-email">Email address</label>
        <input type="email" id="l-email" placeholder={emailPlaceholder} required />
      </div>
      <div className="field">
        <label htmlFor="l-pass">Password</label>
        <input type="password" id="l-pass" placeholder="••••••••" required />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13.5, fontWeight: 400, color: "var(--ink-soft)" }}>
          <input type="checkbox" style={{ width: "auto" }} /> Remember me
        </label>
        <a href="#" style={{ fontSize: 13.5, fontWeight: 600, color: "var(--indigo)" }}>Forgot password?</a>
      </div>
      <button type="submit" className="btn btn-primary btn-block btn-lg">Sign In</button>
      {submitted && (
        <div className="form-inline-success">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
          Signed in — your dashboard is coming soon.
        </div>
      )}
    </form>
  );
}
