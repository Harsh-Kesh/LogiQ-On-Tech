import type { Metadata } from "next";
import { Suspense } from "react";
import HeroArt from "@/components/HeroArt";
import RequestView from "@/components/forms/RequestView";

export const metadata: Metadata = {
  title: "Request a Demo or Quote",
  description: "Book a live demo or get a scoped quote for LogiQ-On's barcode, RFID, wireless, and retail technology.",
};

export default function RequestPage() {
  return (
    <>
      <section className="page-hero">
        <div className="container page-hero-grid">
          <div>
            <span className="eyebrow">Get Started</span>
            <h1>See it live, or get it priced.</h1>
            <p className="lede">
              One form, two outcomes — book a working demo on your own stock, or get a scoped quote for the hardware
              and rollout you need.
            </p>
          </div>
          <HeroArt variant="demo" className="page-hero-art" />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <Suspense fallback={null}>
            <RequestView />
          </Suspense>
        </div>
      </section>
    </>
  );
}
