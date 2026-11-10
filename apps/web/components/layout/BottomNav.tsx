'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

const TABS = [
  { href: '/pass', label: 'Pass' },
  { href: '/offers', label: 'Offers' },
  { href: '/friends', label: 'Friends' },
  { href: '/card', label: 'Card' },
  { href: '/services', label: 'Services' },
] as const;

/** The five-tab bottom navigation. Active tab is orange (docs/architecture.md section 13). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="app-shell sticky bottom-0 z-10 border-t border-divider bg-black/60 backdrop-blur">
      <ul className="flex">
        {TABS.map((tab) => {
          const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
          return (
            <li key={tab.href} className="flex-1">
              <Link
                href={tab.href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-semibold',
                  active ? 'text-orange' : 'text-ink-3',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    active ? 'bg-orange' : 'bg-transparent',
                  )}
                />
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
