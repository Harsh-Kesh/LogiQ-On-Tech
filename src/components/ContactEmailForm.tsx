"use client";

import { useState, type FormEvent } from "react";

export default function ContactEmailForm() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <p className="gsap-animate mt-4 text-base font-bold text-slate-950">
        Thanks — we&apos;ll be in touch within one business day.
      </p>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="gsap-animate flex flex-col sm:flex-row items-center gap-3 mt-4 w-full max-w-md mx-auto"
    >
      <label htmlFor="hero-email" className="sr-only">
        Email address
      </label>
      <input
        id="hero-email"
        name="email"
        type="email"
        required
        placeholder="you@company.com.au"
        className="w-full bg-slate-50 border border-slate-200 text-slate-950 placeholder:text-slate-400 font-medium px-5 py-3.5 rounded-xl focus:bg-white focus:border-slate-950 focus:outline-none shadow-sm text-base transition-colors"
      />
      <button
        type="submit"
        className="w-full sm:w-auto px-7 py-3.5 bg-slate-950 hover:bg-slate-800 text-white font-bold text-base rounded-xl shadow-md transition-all duration-300 hover:scale-105 whitespace-nowrap"
      >
        Send
      </button>
    </form>
  );
}
