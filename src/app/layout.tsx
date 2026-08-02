import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LogiQ-On Tech — Platform Staging Build',
  description: 'Supply Chain, Warehouse & Retail Technology Platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-950 text-white antialiased">{children}</body>
    </html>
  );
}
