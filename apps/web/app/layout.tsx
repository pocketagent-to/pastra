import type { Metadata, Viewport } from 'next';
import { inter, unbounded } from '@/lib/fonts';
import { Providers } from '@/components/auth/Providers';
import { PwaSetup } from '@/components/pwa/PwaSetup';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hextra',
  description: 'Your pass: six sides of your life in one hexagon, plus a crypto card.',
  applicationName: 'HEXTRA',
  // Reserved (non-overlay) status bar: iOS insets the web view below the status bar and above the
  // home indicator itself, so we don't manage safe areas by hand and there's no strip below the nav.
  appleWebApp: { capable: true, title: 'HEXTRA', statusBarStyle: 'black' },
  icons: {
    icon: '/icons/icon-192.png',
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  // theme-color fills the iOS-reserved status-bar / home-indicator areas; match the header/nav chrome.
  themeColor: '#16171B',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${unbounded.variable} ${inter.variable}`}>
      <body>
        <Providers appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}>{children}</Providers>
        <PwaSetup />
      </body>
    </html>
  );
}
