'use client';

import React from 'react';

interface BarcodeRendererProps {
  value: string;
  width?: number;
  height?: number;
  showText?: boolean;
  className?: string;
}

/**
 * Generates a visual Code128/EAN-13 style SVG barcode pattern deterministically from string value
 */
export function BarcodeRenderer({
  value,
  width = 240,
  height = 70,
  showText = true,
  className = '',
}: BarcodeRendererProps) {
  const barcodeValue = (value || '9312345678901').trim();

  // Pseudo-deterministic bar width pattern generation from string characters
  const bars: { width: number; isGap: boolean }[] = [];
  
  // Quiet zone start
  bars.push({ width: 4, isGap: true });
  // Start pattern
  bars.push({ width: 2, isGap: false });
  bars.push({ width: 1, isGap: true });
  bars.push({ width: 2, isGap: false });

  for (let i = 0; i < barcodeValue.length; i++) {
    const charCode = barcodeValue.charCodeAt(i);
    const w1 = (charCode % 3) + 1;
    const w2 = ((charCode * 2) % 3) + 1;
    const w3 = ((charCode * 3) % 2) + 1;
    bars.push({ width: w1, isGap: false });
    bars.push({ width: 1, isGap: true });
    bars.push({ width: w2, isGap: false });
    bars.push({ width: 2, isGap: true });
    bars.push({ width: w3, isGap: false });
    bars.push({ width: 1, isGap: true });
  }

  // Stop pattern
  bars.push({ width: 2, isGap: false });
  bars.push({ width: 1, isGap: true });
  bars.push({ width: 3, isGap: false });
  bars.push({ width: 4, isGap: true });

  const totalUnits = bars.reduce((acc, b) => acc + b.width, 0);
  const barHeight = showText ? height - 18 : height;

  let currentX = 0;

  return (
    <div className={`flex flex-col items-center justify-center p-3 bg-white border border-slate-200 rounded-xl shadow-xs ${className}`}>
      <svg
        viewBox={`0 0 ${totalUnits} ${height}`}
        className="w-full max-w-[280px] h-auto overflow-visible"
        style={{ minHeight: `${height}px` }}
      >
        <rect width={totalUnits} height={height} fill="#ffffff" />
        {bars.map((bar, idx) => {
          const x = currentX;
          currentX += bar.width;
          if (bar.isGap) return null;
          return (
            <rect
              key={idx}
              x={x}
              y={0}
              width={bar.width}
              height={barHeight}
              fill="#0f172a"
            />
          );
        })}

        {showText && (
          <text
            x={totalUnits / 2}
            y={height - 2}
            textAnchor="middle"
            fill="#0f172a"
            fontSize="10"
            fontWeight="bold"
            fontFamily="monospace"
            letterSpacing="2"
          >
            {barcodeValue}
          </text>
        )}
      </svg>
    </div>
  );
}
