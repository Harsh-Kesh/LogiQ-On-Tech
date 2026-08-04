"use client";

import { useState, type FormEvent } from "react";

export default function ContactForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="form-card">
        <div className="form-success">
          <div className="form-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </div>
          <h3>Message sent</h3>
          <p>Thanks for reaching out — we&apos;ll reply within one business day.</p>
          <button type="button" className="btn btn-ghost" onClick={() => setSubmitted(false)}>
            Send another message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="form-card">
      <h3 style={{ fontSize: 20, marginBottom: 24 }}>Send us a message</h3>
      <form onSubmit={handleSubmit} noValidate>
        <div className="field-row">
          <div className="field">
            <label htmlFor="c-name">Full name <span className="req">*</span></label>
            <input type="text" id="c-name" name="name" placeholder="Jordan Smith" required />
          </div>
          <div className="field">
            <label htmlFor="c-company">Company</label>
            <input type="text" id="c-company" name="company" placeholder="Your business name" />
          </div>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="c-email">Email <span className="req">*</span></label>
            <input type="email" id="c-email" name="email" placeholder="you@company.com.au" required />
          </div>
          <div className="field">
            <label htmlFor="c-phone">Phone</label>
            <input type="tel" id="c-phone" name="phone" placeholder="04xx xxx xxx" />
          </div>
        </div>
        <div className="field">
          <label htmlFor="c-topic">What can we help with?</label>
          <select id="c-topic" name="topic" defaultValue="General enquiry">
            <option>General enquiry</option>
            <option>Barcode &amp; RFID scanning</option>
            <option>Wireless site survey</option>
            <option>Electronic Shelf Labels / Digital Signage</option>
            <option>Partnership enquiry</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="c-message">Message <span className="req">*</span></label>
          <textarea id="c-message" name="message" placeholder="Tell us a bit about your operation…" required />
        </div>
        <button type="submit" className="btn btn-primary btn-block btn-lg">Send Message</button>
      </form>
    </div>
  );
}
