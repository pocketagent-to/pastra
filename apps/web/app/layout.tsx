import type { Metadata, Viewport } from 'next';
import { inter, unbounded } from '@/lib/fonts';
import './globals.css';

export const metadata: Metadata = {
  title: 'Pastra',
  description: 'Your pass: six sides of your life in one hexagon, plus a crypto card.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#05081f',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${inter.variable}`}>
      <body>{children}</body>
    </html>
  );
}
