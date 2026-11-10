import { Inter, Unbounded } from 'next/font/google';

/** Headings — Unbounded (docs/architecture.md section 13). */
export const unbounded = Unbounded({
  subsets: ['latin'],
  weight: ['500', '700', '800'],
  variable: '--font-unbounded',
  display: 'swap',
});

/** Body text — Inter. */
export const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
});
