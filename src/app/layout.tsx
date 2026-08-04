import type { Metadata } from 'next';
import './globals.css';
import './stitch.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'LogiQ-On Tech — Supply Chain, Warehouse & Retail Technology',
  description: "LogiQ-On Tech orchestrates the world's most complex supply chains with real-time AI insights, seamless connectivity, and industrial-grade reliability.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;700&family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
