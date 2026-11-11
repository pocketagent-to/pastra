import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

/** Top header: logo + wordmark left, profile icon (to Settings) right (design/Main.html). */
export function AppHeader() {
  return (
    <header className="app-shell pwa-safe-top flex items-center justify-between bg-[#16171B] px-5 pb-3.5">
      <Link href="/pass" aria-label="Hextra home" className="flex items-center gap-2.5">
        <Logo size={34} />
        <span className="font-head text-lg font-extrabold tracking-[0.04em]">HEXTRA</span>
      </Link>
      <Link
        href="/settings"
        aria-label="Profile and settings"
        className="flex h-11 w-11 items-center justify-center rounded-xl border-[1.5px] border-white text-white"
      >
        <svg
          viewBox="0 0 24 24"
          width="22"
          height="22"
          aria-hidden="true"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        >
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
        </svg>
      </Link>
    </header>
  );
}
