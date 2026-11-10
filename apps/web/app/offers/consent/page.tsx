import Link from 'next/link';
import { currentWeek } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { requireUser } from '@/lib/data';

export const dynamic = 'force-dynamic';

const WE_USE = [
  'Your six sides and your level',
  'Activity in services you connected',
  'Your country, to show what works there',
];

const WE_NEVER = [
  'Use health or activity-tracker data for offers',
  'Give partners your name or your data',
];

/** D2 · Offers — turn on personal offers (default off, docs/product-spec.md section 12). */
export default async function OffersConsent() {
  await requireUser();
  const weekNumber = currentWeek().split('-W')[1] ?? '';

  return (
    <AppShell tab className="flex flex-col">
      <div className="flex flex-1 flex-col gap-[22px] pt-2">
        <div className="flex flex-col gap-3">
          <span className="self-start rounded-chip bg-[linear-gradient(90deg,#3D6BFF,#6A3DFF)] px-3.5 py-2 font-head text-[11px] font-bold uppercase tracking-[0.05em]">
            WEEK {weekNumber}
          </span>
          <h1 className="text-gradient font-head text-[26px] font-extrabold uppercase leading-tight">
            Offers that match your week
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Every drop we can pick offers from what you did last week. It&apos;s off until you say
            yes.
          </p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">We use</div>
          <div className="flex flex-col rounded-panel bg-panel px-4">
            {WE_USE.map((item) => (
              <div key={item} className="flex min-h-12 items-center gap-3 text-sm">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="flex-shrink-0 text-green"
                >
                  <path d="M5 12.5l4.5 4.5L19 7.5" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
            We never
          </div>
          <div className="flex flex-col rounded-panel bg-panel px-4">
            {WE_NEVER.map((item) => (
              <div key={item} className="flex min-h-12 items-center gap-3 text-sm">
                <svg
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  aria-hidden="true"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  className="flex-shrink-0 text-[#FF8A7A]"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <Link
            href="/offers"
            className="flex h-14 items-center justify-center rounded-button font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
            style={{ background: 'var(--grad-button)' }}
          >
            Turn on my offers
          </Link>
          <Link
            href="/offers"
            className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink font-head text-[13px] font-bold uppercase tracking-[0.03em] text-ink"
          >
            Show general offers only
          </Link>
          <p className="text-center text-[13px] leading-relaxed text-ink-3">
            Change it any time in Settings.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
