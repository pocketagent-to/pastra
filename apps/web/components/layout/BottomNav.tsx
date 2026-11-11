'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/** Tab icons, traced from the mockups (design/Main.html footer). */
const iconProps = {
  viewBox: '0 0 24 24',
  width: 25,
  height: 25,
  'aria-hidden': true,
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

function PassIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5" />
      <path d="M16 5a3.5 3.5 0 010 6.5M18 14.8c2 .7 3.5 2.3 3.5 5.2" />
    </svg>
  );
}

function CardIcon() {
  return (
    <svg {...iconProps}>
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
    </svg>
  );
}

function ServicesIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

const TABS = [
  { href: '/pass', label: 'Pass', Icon: PassIcon },
  { href: '/friends', label: 'Friends', Icon: FriendsIcon },
  { href: '/card', label: 'Card', Icon: CardIcon },
  { href: '/services', label: 'Services', Icon: ServicesIcon },
] as const;

// Offers is hidden for now: offers are card-tied and the card is not live yet (Wirex pending). The
// offer engine, admin tooling and /offers routes stay intact; `/offers` redirects to /pass (see
// next.config.ts) and the tab returns when the card launches.
/** The bottom navigation. Active tab is orange (docs/architecture.md section 13). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="app-bottom-nav app-shell shrink-0 border-t border-divider bg-[#16171B]">
      <ul className="grid grid-cols-4">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex min-h-[70px] flex-col items-center justify-center gap-1.5 text-[12px] font-semibold',
                  active ? 'text-orange' : 'text-ink-3',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
