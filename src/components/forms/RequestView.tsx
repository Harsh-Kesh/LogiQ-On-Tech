"use client";

import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SegmentedToggle from "@/components/SegmentedToggle";

type RequestType = "demo" | "quote";

const INTERESTS = [
  "Mobile Computing",
  "Barcode Scanning",
  "RFID",
  "Wireless Infrastructure",
  "ESL / Digital Signage",
  "Software / Stock-Taking",
];

export default function RequestView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [type, setType] = useState<RequestType>(searchParams.get("type") === "quote" ? "quote" : "demo");
  const [submitted, setSubmitted] = useState(false);
  const isQuote = type === "quote";

  function handleChange(value: string) {
    const next = value as RequestType;
    setType(next);
    setSubmitted(false);
    router.replace(next === "quote" ? "/request?type=quote" : "/request", { scroll: false });
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="split reverse">
      <div className="form-card">
        <SegmentedToggle
          value={type}
          onChange={handleChange}
          options={[
            { value: "demo", label: "Request a Demo" },
            { value: "quote", label: "Request a Quote" },
          ]}
        />

        {submitted ? (
          <div className="form-success">
            <div className="form-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3>{isQuote ? "Quote request received" : "Demo request received"}</h3>
            <p>
              {isQuote
                ? "A specialist will confirm scope and send a written quote, typically within 2 business days."
                : "A LogiQ-On specialist will confirm your slot within one business day."}
            </p>
            <button type="button" className="btn btn-ghost" onClick={() => setSubmitted(false)}>
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} noValidate style={{ marginTop: 24 }}>
            <div className="field-row">
              <div className="field">
                <label htmlFor="r-name">Full name <span className="req">*</span></label>
                <input type="text" id="r-name" placeholder="Jordan Smith" required />
              </div>
              <div className="field">
                <label htmlFor="r-company">Company <span className="req">*</span></label>
                <input type="text" id="r-company" placeholder="Your business name" required />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <label htmlFor="r-email">Work email <span className="req">*</span></label>
                <input type="email" id="r-email" placeholder="you@company.com.au" required />
              </div>
              <div className="field">
                <label htmlFor="r-phone">Phone</label>
                <input type="tel" id="r-phone" placeholder="04xx xxx xxx" />
              </div>
            </div>

            {isQuote ? (
              <>
                <div className="field">
                  <label htmlFor="r-category">Product / solution category</label>
                  <select id="r-category" defaultValue="Mobile Computers">
                    <option>Mobile Computers</option>
                    <option>Barcode Scanners</option>
                    <option>Label Printing</option>
                    <option>RFID Solutions</option>
                    <option>Wireless Infrastructure</option>
                    <option>Digital Display / ESL</option>
                    <option>Not sure yet</option>
                  </select>
                </div>
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="r-qty">Approximate quantity</label>
                    <input type="text" id="r-qty" placeholder="e.g. 25 handhelds" />
                  </div>
                  <div className="field">
                    <label htmlFor="r-timeline">Timeline</label>
                    <select id="r-timeline" defaultValue="Within 1 month">
                      <option>Within 1 month</option>
                      <option>1–3 months</option>
                      <option>3–6 months</option>
                      <option>Just exploring</option>
                    </select>
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="r-message">Anything else we should know?</label>
                  <textarea id="r-message" placeholder="Site locations, current systems, compliance requirements…" />
                </div>
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="r-industry">Industry</label>
                  <select id="r-industry" defaultValue="Warehousing & 3PL">
                    <option>Warehousing &amp; 3PL</option>
                    <option>Retail</option>
                    <option>Manufacturing</option>
                    <option>Food &amp; Beverage / Cold Chain</option>
                    <option>Healthcare</option>
                    <option>Transport &amp; Distribution</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="field">
                  <label>Areas of interest</label>
                  <div className="checkbox-grid">
                    {INTERESTS.map((label) => (
                      <label key={label} className="checkbox-inline">
                        <input type="checkbox" style={{ width: "auto" }} /> {label}
                      </label>
                    ))}
                  </div>
                </div>
                <div className="field">
                  <label htmlFor="r-message">What would you like the demo to cover?</label>
                  <textarea id="r-message" placeholder="e.g. RFID stocktake accuracy for a 3-store retail chain" />
                </div>
              </>
            )}

            <button type="submit" className="btn btn-primary btn-block btn-lg">
              {isQuote ? "Request a Quote" : "Request a Demo"}
            </button>
          </form>
        )}
      </div>

      <div>
        {isQuote ? (
          <>
            <span className="eyebrow">How quoting works</span>
            <h2 style={{ marginTop: 14 }}>One number, everything included.</h2>
            <div className="grid" style={{ marginTop: 24, gap: 16 }}>
              <div className="card" style={{ padding: 20 }}>
                <span className="tag">01</span>
                <h3 style={{ fontSize: 16 }}>We confirm scope</h3>
                <p>A specialist calls to confirm quantities, sites, and any compliance needs.</p>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <span className="tag">02</span>
                <h3 style={{ fontSize: 16 }}>We price the full rollout</h3>
                <p>Hardware, software, installation, and training — quoted as one package.</p>
              </div>
              <div className="card" style={{ padding: 20 }}>
                <span className="tag">03</span>
                <h3 style={{ fontSize: 16 }}>You get a written quote</h3>
                <p>Typically within 2 business days for standard hardware categories.</p>
              </div>
            </div>
          </>
        ) : (
          <>
            <span className="eyebrow">What to expect</span>
            <h2 style={{ marginTop: 14 }}>A demo built around your stock, not a script.</h2>
            <ul className="checklist" style={{ marginTop: 24 }}>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> 30–45 minute session, in person or online</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> Hardware and software matched to your areas of interest</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> No obligation — a scoped quote only follows if you ask for one</li>
              <li><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg> A LogiQ-On specialist confirms your slot within one business day</li>
            </ul>
            <div className="card" style={{ marginTop: 28, padding: 22 }}>
              <span className="tag">Prefer to talk first?</span>
              <h3 style={{ fontSize: 17 }}>Call 1300 717 433</h3>
              <p>Or email info@logiqon.com.au</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
