import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Support Admin',
  description: 'Admin dashboard for AI Support Widget',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-950 text-gray-100 antialiased">{children}</body>
    </html>
  );
}
