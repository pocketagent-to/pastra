'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/cn';

/** Tab icons, traced from the mockups (design/Main.html footer). */
const iconProps = {
  viewBox: '0 0 24 24',
  width: 22,
  height: 22,
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

function OffersIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 12v8h16v-8" />
      <path d="M2 8h20v4H2z" />
      <path d="M12 8v12" />
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
  { href: '/offers', label: 'Offers', Icon: OffersIcon },
  { href: '/friends', label: 'Friends', Icon: FriendsIcon },
  { href: '/card', label: 'Card', Icon: CardIcon },
  { href: '/services', label: 'Services', Icon: ServicesIcon },
] as const;

/** The five-tab bottom navigation. Active tab is orange (docs/architecture.md section 13). */
export function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="app-shell shrink-0 border-t border-divider bg-[#16171B]">
      <ul className="grid grid-cols-5">
        {TABS.map(({ href, label, Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  'flex min-h-14 flex-col items-center justify-center gap-1 pb-1 text-[11px] font-semibold',
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
