import Link from 'next/link';
import { Logo } from '@/components/brand/Logo';

/** Top header: logo left, profile icon (to Settings) right. */
export function AppHeader() {
  return (
    <header className="app-shell flex items-center justify-between px-4 py-3">
      <Link href="/pass" aria-label="Pastra home">
        <Logo size={28} />
      </Link>
      <Link
        href="/settings"
        aria-label="Settings"
        className="flex h-9 w-9 items-center justify-center rounded-full border border-divider bg-panel text-ink-2"
      >
        ⚙
      </Link>
    </header>
  );
}
