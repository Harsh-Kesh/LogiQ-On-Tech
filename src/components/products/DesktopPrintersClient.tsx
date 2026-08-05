"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { DESKTOP_PRINTERS, DesktopPrinter, TechnologyType } from "@/lib/data/desktop-printers";
import { getAssetPath } from "@/lib/nav";

const ARROW = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

const SEARCH_ICON = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="18" height="18">
    <circle cx="11" cy="11" r="8" />
    <path d="M21 21l-4.35-4.35" />
  </svg>
);

const CHECK = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
    <path d="M20 6L9 17l-5-5" />
  </svg>
);

const CLOSE = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="20" height="20">
    <path d="M18 6L6 18M6 6l12 12" />
  </svg>
);

export default function DesktopPrintersClient() {
  const [search, setSearch] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<string>("All");
  const [selectedTech, setSelectedTech] = useState<string>("All");
  const [activeModalPrinter, setActiveModalPrinter] = useState<DesktopPrinter | null>(null);

  const filteredPrinters = useMemo(() => {
    return DESKTOP_PRINTERS.filter((printer) => {
      const matchesSearch =
        search === "" ||
        printer.model.toLowerCase().includes(search.toLowerCase()) ||
        printer.title.toLowerCase().includes(search.toLowerCase()) ||
        printer.brand.toLowerCase().includes(search.toLowerCase()) ||
        printer.description.toLowerCase().includes(search.toLowerCase()) ||
        printer.industries.some((ind) => ind.toLowerCase().includes(search.toLowerCase()));

      const matchesBrand = selectedBrand === "All" || printer.brand === selectedBrand;

      const matchesTech =
        selectedTech === "All" ||
        printer.technology.includes(selectedTech) ||
        selectedTech.includes(printer.technology);

      return matchesSearch && matchesBrand && matchesTech;
    });
  }, [search, selectedBrand, selectedTech]);

  return (
    <>
      {/* Breadcrumbs Navigation */}
      <div className="container" style={{ paddingTop: 24, paddingBottom: 8 }}>
        <nav aria-label="Breadcrumb" style={{ fontSize: 14, color: "var(--ink-soft)" }}>
          <ol style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, listStyle: "none", margin: 0, padding: 0 }}>
            <li>
              <Link href="/" style={{ color: "var(--ink-soft)", textDecoration: "none" }}>Home</Link>
            </li>
            <li>&rsaquo;</li>
            <li>
              <Link href="/products" style={{ color: "var(--ink-soft)", textDecoration: "none" }}>Products</Link>
            </li>
            <li>&rsaquo;</li>
            <li>
              <span style={{ color: "var(--ink-soft)" }}>Label Printing</span>
            </li>
            <li>&rsaquo;</li>
            <li>
              <span style={{ color: "var(--brand-primary, #0ce3fb)", fontWeight: 600 }}>Desktop Printers</span>
            </li>
          </ol>
        </nav>
      </div>

      {/* Main Controls Section */}
      <section className="section" style={{ paddingTop: 20 }}>
        <div className="container">
          {/* Search & Filters */}
          <div
            style={{
              background: "var(--surface-card, rgba(255, 255, 255, 0.03))",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.1))",
              borderRadius: 12,
              padding: 24,
              marginBottom: 40,
              display: "flex",
              flexDirection: "column",
              gap: 20,
            }}
          >
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {/* Search Bar */}
              <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
                <span
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--ink-soft)",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  {SEARCH_ICON}
                </span>
                <input
                  type="text"
                  placeholder="Search by printer model, feature, or industry..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "12px 14px 12px 42px",
                    borderRadius: 8,
                    border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
                    background: "rgba(0, 0, 0, 0.2)",
                    color: "inherit",
                    fontSize: 14,
                    outline: "none",
                  }}
                />
              </div>

              {/* Reset Button if filtered */}
              {(search || selectedBrand !== "All" || selectedTech !== "All") && (
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setSelectedBrand("All");
                    setSelectedTech("All");
                  }}
                  className="btn btn-secondary"
                  style={{ fontSize: 13, padding: "10px 16px" }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 24, alignItems: "center" }}>
              {/* Brand Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Manufacturer:
                </span>
                {["All", "Bixolon", "Honeywell", "Zebra"].map((brand) => (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedBrand(brand)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: "1px solid",
                      borderColor: selectedBrand === brand ? "var(--brand-primary, #0ce3fb)" : "rgba(255, 255, 255, 0.15)",
                      background: selectedBrand === brand ? "rgba(12, 227, 251, 0.15)" : "transparent",
                      color: selectedBrand === brand ? "var(--brand-primary, #0ce3fb)" : "inherit",
                      fontSize: 13,
                      fontWeight: selectedBrand === brand ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {brand === "All" ? "All Brands" : brand}
                  </button>
                ))}
              </div>

              {/* Technology Filter */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-soft)", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Technology:
                </span>
                {["All", "Direct Thermal", "Thermal Transfer"].map((tech) => (
                  <button
                    key={tech}
                    type="button"
                    onClick={() => setSelectedTech(tech)}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border: "1px solid",
                      borderColor: selectedTech === tech ? "var(--brand-primary, #0ce3fb)" : "rgba(255, 255, 255, 0.15)",
                      background: selectedTech === tech ? "rgba(12, 227, 251, 0.15)" : "transparent",
                      color: selectedTech === tech ? "var(--brand-primary, #0ce3fb)" : "inherit",
                      fontSize: 13,
                      fontWeight: selectedTech === tech ? 600 : 400,
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {tech === "All" ? "All Tech" : tech}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results summary */}
          <div style={{ marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink-soft)" }}>
              Showing <strong style={{ color: "inherit" }}>{filteredPrinters.length}</strong> desktop printer models
            </p>
          </div>

          {/* Printer Cards Grid */}
          <div className="grid grid-3">
            {filteredPrinters.map((printer) => (
              <div
                key={printer.id}
                className="card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  position: "relative",
                  borderColor: printer.highlighted ? "rgba(12, 227, 251, 0.4)" : undefined,
                  boxShadow: printer.highlighted ? "0 0 20px rgba(12, 227, 251, 0.1)" : undefined,
                }}
              >
                <div>
                  {/* Badges bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <span className="tag" style={{ textTransform: "none", fontWeight: 600 }}>
                      {printer.brand}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        padding: "3px 8px",
                        borderRadius: 4,
                        background: printer.technology.includes("Direct") && printer.technology.includes("Transfer")
                          ? "rgba(168, 85, 247, 0.15)"
                          : printer.technology.includes("Direct")
                          ? "rgba(59, 130, 246, 0.15)"
                          : "rgba(34, 197, 94, 0.15)",
                        color: printer.technology.includes("Direct") && printer.technology.includes("Transfer")
                          ? "#c084fc"
                          : printer.technology.includes("Direct")
                          ? "#60a5fa"
                          : "#4ade80",
                        border: "1px solid currentColor",
                      }}
                    >
                      {printer.technology}
                    </span>
                  </div>

                  {/* Printer Image */}
                  <div
                    style={{
                      width: "100%",
                      height: 200,
                      position: "relative",
                      marginBottom: 20,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "rgba(255, 255, 255, 0.02)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Image
                      src={getAssetPath(printer.image)}
                      alt={printer.model}
                      width={220}
                      height={180}
                      style={{ objectFit: "contain", maxHeight: 180, width: "auto" }}
                    />
                  </div>

                  <h3 style={{ marginBottom: 6, fontSize: 20 }}>{printer.model}</h3>
                  <p style={{ fontSize: 13, color: "var(--brand-primary, #0ce3fb)", fontWeight: 600, marginBottom: 12 }}>
                    {printer.title}
                  </p>
                  <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>{printer.description}</p>

                  {/* Key specs list */}
                  <div
                    style={{
                      padding: 12,
                      borderRadius: 8,
                      background: "rgba(0, 0, 0, 0.2)",
                      marginBottom: 16,
                      fontSize: 13,
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                    }}
                  >
                    <div>
                      <strong style={{ color: "var(--ink-soft)" }}>Resolution: </strong>
                      {printer.specs.resolution}
                    </div>
                    <div>
                      <strong style={{ color: "var(--ink-soft)" }}>Print Speed: </strong>
                      {printer.specs.printSpeed}
                    </div>
                    <div>
                      <strong style={{ color: "var(--ink-soft)" }}>Print Width: </strong>
                      {printer.specs.printWidth}
                    </div>
                    {printer.specs.interfaces && (
                      <div style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        <strong style={{ color: "var(--ink-soft)" }}>Connectivity: </strong>
                        {printer.specs.interfaces.join(", ")}
                      </div>
                    )}
                  </div>

                  {/* Industry Tags */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 20 }}>
                    {printer.industries.map((ind) => (
                      <span
                        key={ind}
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          borderRadius: 12,
                          background: "rgba(255, 255, 255, 0.06)",
                          color: "var(--ink-soft)",
                        }}
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Card Actions */}
                <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                  <button
                    type="button"
                    onClick={() => setActiveModalPrinter(printer)}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: 13, padding: "8px 12px", justifyContent: "center" }}
                  >
                    Full Specs
                  </button>
                  <Link
                    href={`/request?type=quote&category=desktop-printers&model=${encodeURIComponent(printer.model)}`}
                    className="btn btn-primary"
                    style={{ flex: 1, fontSize: 13, padding: "8px 12px", justifyContent: "center", textDecoration: "none" }}
                  >
                    Get Pricing
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {filteredPrinters.length === 0 && (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <h3>No matching desktop printers found</h3>
              <p style={{ color: "var(--ink-soft)", marginBottom: 20 }}>
                Try adjusting your search criteria or clearing manufacturer / technology filters.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setSearch("");
                  setSelectedBrand("All");
                  setSelectedTech("All");
                }}
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Featured Solution Section */}
      <section className="section tint">
        <div className="container split">
          <div>
            <span className="eyebrow">Expert Advice & Fleet Supply</span>
            <h2>Need help choosing the right desktop label printer?</h2>
            <p className="lede">
              Whether you need direct thermal for short-life shipping labels or durable thermal transfer for outdoor asset tags, LogiQ-On provides tailored hardware selection, thermal media supplies, and Australian-wide deployment support.
            </p>
            <ul className="checklist">
              <li>{CHECK} Expert assessment of media, ribbon, and environment requirements</li>
              <li>{CHECK} Pre-configured IP addresses, wireless settings, and driver support</li>
              <li>{CHECK} Bulk fleet pricing and ongoing consumables replenishment</li>
              <li>{CHECK} Integration with ERP, WMS, and retail POS software</li>
            </ul>
            <div style={{ marginTop: 28, display: "flex", gap: 14 }}>
              <Link href="/request?type=quote&category=desktop-printers" className="btn btn-primary">
                Request Fleet Pricing {ARROW}
              </Link>
              <Link href="/contact" className="btn btn-secondary">
                Speak to a Hardware Specialist
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Detailed Spec Modal */}
      {activeModalPrinter && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(4px)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
          onClick={() => setActiveModalPrinter(null)}
        >
          <div
            style={{
              background: "#121316",
              border: "1px solid var(--border-color, rgba(255, 255, 255, 0.15))",
              borderRadius: 16,
              maxWidth: 640,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 32,
              position: "relative",
              color: "inherit",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setActiveModalPrinter(null)}
              style={{
                position: "absolute",
                right: 20,
                top: 20,
                background: "transparent",
                border: "none",
                color: "var(--ink-soft)",
                cursor: "pointer",
              }}
            >
              {CLOSE}
            </button>

            <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 12 }}>
              <span className="tag">{activeModalPrinter.brand}</span>
              <span style={{ fontSize: 12, color: "var(--brand-primary, #0ce3fb)", fontWeight: 600 }}>
                {activeModalPrinter.technology}
              </span>
            </div>

            <h2 style={{ fontSize: 26, marginBottom: 8 }}>{activeModalPrinter.model}</h2>
            <p style={{ color: "var(--ink-soft)", fontSize: 15, marginBottom: 20 }}>{activeModalPrinter.title}</p>

            <div
              style={{
                width: "100%",
                height: 220,
                position: "relative",
                marginBottom: 24,
                borderRadius: 8,
                background: "rgba(255, 255, 255, 0.02)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Image
                src={getAssetPath(activeModalPrinter.image)}
                alt={activeModalPrinter.model}
                width={260}
                height={200}
                style={{ objectFit: "contain", maxHeight: 200 }}
              />
            </div>

            <h4 style={{ marginBottom: 8, fontSize: 16 }}>Overview</h4>
            <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-soft)", marginBottom: 24 }}>
              {activeModalPrinter.description}
            </p>

            <h4 style={{ marginBottom: 12, fontSize: 16 }}>Detailed Specifications</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24, fontSize: 14 }}>
              <div style={{ padding: 12, background: "rgba(255, 255, 255, 0.03)", borderRadius: 8 }}>
                <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Resolution</div>
                <div style={{ fontWeight: 600 }}>{activeModalPrinter.specs.resolution}</div>
              </div>

              <div style={{ padding: 12, background: "rgba(255, 255, 255, 0.03)", borderRadius: 8 }}>
                <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Print Speed</div>
                <div style={{ fontWeight: 600 }}>{activeModalPrinter.specs.printSpeed}</div>
              </div>

              <div style={{ padding: 12, background: "rgba(255, 255, 255, 0.03)", borderRadius: 8 }}>
                <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Maximum Print Width</div>
                <div style={{ fontWeight: 600 }}>{activeModalPrinter.specs.printWidth}</div>
              </div>

              {activeModalPrinter.specs.ribbonCapacity && (
                <div style={{ padding: 12, background: "rgba(255, 255, 255, 0.03)", borderRadius: 8 }}>
                  <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Ribbon Capacity</div>
                  <div style={{ fontWeight: 600 }}>{activeModalPrinter.specs.ribbonCapacity}</div>
                </div>
              )}

              {activeModalPrinter.specs.mediaHandling && (
                <div style={{ padding: 12, background: "rgba(255, 255, 255, 0.03)", borderRadius: 8 }}>
                  <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Media Handling</div>
                  <div style={{ fontWeight: 600 }}>{activeModalPrinter.specs.mediaHandling}</div>
                </div>
              )}

              <div style={{ padding: 12, background: "rgba(255, 255, 255, 0.03)", borderRadius: 8, gridColumn: "1 / -1" }}>
                <div style={{ color: "var(--ink-soft)", fontSize: 12 }}>Supported Interfaces</div>
                <div style={{ fontWeight: 600 }}>{activeModalPrinter.specs.interfaces.join(" · ")}</div>
              </div>
            </div>

            <h4 style={{ marginBottom: 8, fontSize: 16 }}>Target Industries</h4>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 32 }}>
              {activeModalPrinter.industries.map((ind) => (
                <span
                  key={ind}
                  style={{
                    fontSize: 12,
                    padding: "4px 12px",
                    borderRadius: 16,
                    background: "rgba(12, 227, 251, 0.12)",
                    color: "var(--brand-primary, #0ce3fb)",
                    border: "1px solid rgba(12, 227, 251, 0.3)",
                  }}
                >
                  {ind}
                </span>
              ))}
            </div>

            <div style={{ display: "flex", gap: 12 }}>
              <Link
                href={`/request?type=quote&category=desktop-printers&model=${encodeURIComponent(activeModalPrinter.model)}`}
                className="btn btn-primary"
                style={{ flex: 1, justifyContent: "center", textDecoration: "none" }}
              >
                Request Quote for {activeModalPrinter.model} {ARROW}
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
