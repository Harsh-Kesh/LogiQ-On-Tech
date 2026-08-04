import type { Metadata } from "next";
import Image from "next/image";
import ContactForm from "@/components/forms/ContactForm";
import { getAssetPath } from "@/lib/nav";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Talk to the LogiQ-On team about barcode, RFID, wireless, and retail technology for your operation.",
};

export default function ContactPage() {
  return (
    <div className="bg-background">
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden bg-slate-950 pt-36 pb-20 w-full">
        <div className="absolute inset-0 z-0">
          <Image
            src={getAssetPath("/images/pexels/contact-support-team.jpg")}
            alt="Contact LogiQ-On Team"
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/95 via-slate-950/65 to-slate-950/40 pointer-events-none" />
        </div>
        <div className="relative z-10 px-margin-desktop max-w-3xl mx-auto w-full text-center">
          <span
            className="inline-block font-label-md text-label-md text-white bg-white/20 border border-white/40 px-4 py-1.5 rounded-full mb-6 uppercase tracking-widest backdrop-blur-md shadow-sm"
            style={{ color: "#ffffff" }}
          >
            Contact Us
          </span>
          <h1
            className="font-display-lg text-4xl sm:text-5xl md:text-6xl font-extrabold text-white leading-tight mb-6 drop-shadow-2xl tracking-tight"
            style={{ color: "#ffffff" }}
          >
            Talk to the friendly team at LogiQ-On.
          </h1>
          <p
            className="font-body-md text-lg md:text-xl text-white max-w-2xl mx-auto drop-shadow-lg leading-relaxed font-normal"
            style={{ color: "rgba(255, 255, 255, 0.95)" }}
          >
            Ask a question, book a site survey, or start scoping a discovery session &mdash; a real person picks
            this up, not a queue.
          </p>
        </div>
      </section>

      <section className="py-20 px-margin-desktop max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
          <div>
            <h2 className="text-3xl sm:text-4xl font-extrabold mb-12 text-slate-950 tracking-tight">Reach Us Directly</h2>
            <div className="space-y-10 pt-2">
              <div className="flex items-start gap-6 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 rounded-xl shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">location_on</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1 text-slate-950">Office</h4>
                  <p className="text-slate-700 leading-relaxed font-medium">
                    Melbourne, Victoria, Australia
                  </p>
                  <p className="text-slate-500 text-sm leading-relaxed mt-0.5">Site visits available across Australia.</p>
                </div>
              </div>
              <div className="flex items-start gap-6 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 rounded-xl shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">phone_in_talk</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1 text-slate-950">Call Our Experts</h4>
                  <p className="text-slate-700 font-semibold">1300 717 433</p>
                  <p className="text-slate-600 text-sm mt-0.5">03 9448 8011</p>
                </div>
              </div>
              <div className="flex items-start gap-6 p-4 rounded-xl hover:bg-slate-50 transition-colors">
                <div className="w-12 h-12 bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0 rounded-xl shadow-sm">
                  <span className="material-symbols-outlined text-[24px]">mail</span>
                </div>
                <div>
                  <h4 className="text-lg font-bold mb-1 text-slate-950">Digital Inquiries</h4>
                  <p className="text-slate-700 font-semibold">info@logiqon.com.au</p>
                  <p className="text-slate-500 text-sm mt-0.5">We aim to respond within one business day.</p>
                </div>
              </div>
            </div>
          </div>

          <ContactForm />
        </div>
      </section>
    </div>
  );
}
