import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

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
      <body className="bg-slate-950 text-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
