import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Support AI | AI Customer Support for SaaS and Digital Products',
  description: 'Scale customer support with answers tailored to each account, right inside your product. Get started free with Support AI.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-surface-0 text-surface-900 antialiased">{children}</body>
    </html>
  );
}
