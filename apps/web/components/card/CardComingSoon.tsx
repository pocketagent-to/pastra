'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Rarity } from '@pastra/scoring';
import { CardFace } from '@/components/card/CardFace';
import { GradientText } from '@/components/ui/GradientText';
import { StatusChip } from '@/components/ui/StatusChip';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

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

function CardIcon() {
  return (
    <svg {...iconProps} className="shrink-0 text-orange">
      <rect x="2.5" y="5" width="19" height="14" rx="3" />
      <path d="M2.5 10h19" />
    </svg>
  );
}

function CashbackIcon() {
  return (
    <svg {...iconProps} className="shrink-0 text-orange">
      <path d="M4 12v8h16v-8" />
      <path d="M2 8h20v4H2z" />
      <path d="M12 8v12" />
    </svg>
  );
}

function HexIcon() {
  return (
    <svg {...iconProps} className="shrink-0 text-orange">
      <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" />
    </svg>
  );
}

const VALUE_ROWS = [
  { Icon: CardIcon, label: 'A crypto Visa card, tied to your pass' },
  { Icon: CashbackIcon, label: 'Cashback on the sides you’re strong in' },
  { Icon: HexIcon, label: 'A card look that levels up with you' },
];

/**
 * F5 · Card — coming-soon / beta waitlist. The card is not live yet (Wirex pending), so instead of
 * an active-card dashboard this shows the user's own HEXTRA card wearing a "coming soon" treatment
 * and a single CTA to apply for beta access. Applying flips the same screen to a confirmed state.
 * CardFace is reused untouched; the coming-soon look is a page-level wrapper (glow + pill overlay).
 */
export function CardComingSoon({
  handle,
  level,
  rarity,
  initialApplied,
}: {
  handle: string;
  level: number;
  rarity: Rarity;
  initialApplied: boolean;
}) {
  const router = useRouter();
  const [applied, setApplied] = useState(initialApplied);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function apply() {
    if (busy || applied) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/card/waitlist', { method: 'POST' });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean };
      if (res.ok && data.ok) {
        setApplied(true);
        router.refresh();
        return;
      }
      setError('Something went wrong. Try again.');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 pt-2">
      {/* Hero: the user's own card, floating with a coming-soon treatment (CardFace untouched). */}
      <div className="relative isolate">
        <div
          aria-hidden
          className="absolute inset-0 -z-10 scale-[0.97] rounded-card opacity-50 blur-2xl"
          style={{ background: 'var(--grad-card)' }}
        />
        {/* No last4: the card isn't issued yet, so the bottom line reads just the level. */}
        <CardFace name={handle} level={level} rarity={rarity} />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span
            className={cn(
              'rounded-full border px-4 py-2 font-head text-[11px] font-bold uppercase tracking-[0.14em] backdrop-blur-md',
              applied
                ? 'border-green/50 bg-green/15 text-green'
                : 'border-white/30 bg-white/15 text-white',
            )}
          >
            {applied ? 'On the list' : 'Coming soon'}
          </span>
        </div>
      </div>

      {/* Headline + subcopy — same slot in both states. */}
      <div className="flex flex-col gap-2">
        <GradientText className="text-[28px] font-extrabold uppercase leading-[1.1]">
          {applied ? 'You’re on the list' : 'Your hexagon becomes a card'}
        </GradientText>
        <p className="text-[15px] leading-relaxed text-ink-2">
          {applied
            ? 'Nice — you’re in for early access. We’ll light up your card right here the moment it’s ready to claim.'
            : 'The card isn’t live yet. It’s a crypto Visa tied to your pass — it levels up as you do, and its cashback follows the sides you’re strong in.'}
        </p>
      </div>

      {/* What you get — stays in both states. */}
      <section className="rounded-panel bg-panel px-4">
        {VALUE_ROWS.map(({ Icon, label }, i) => (
          <div
            key={label}
            className={cn('flex items-center gap-3 py-[14px]', i > 0 && 'border-t border-divider')}
          >
            <Icon />
            <span className="text-[14px]">{label}</span>
          </div>
        ))}
      </section>

      {/* CTA / confirmed — deep-blue panel reused from the public pass. */}
      <div className="flex flex-col gap-3 rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
        {applied ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">Beta access requested</div>
                <div className="text-xs text-ink-3">We’ll show it here when it’s ready</div>
              </div>
              <StatusChip>Applied</StatusChip>
            </div>
            <OutlineButton href={`/${handle}`}>Share my pass</OutlineButton>
          </>
        ) : (
          <>
            <PrimaryButton onClick={apply} disabled={busy}>
              {busy ? 'Applying…' : 'Apply for beta access'}
            </PrimaryButton>
            <p className="text-center text-[13px] text-ink-2">
              Be one of the first to carry a HEXTRA card.
            </p>
            {error && <p className="text-center text-[13px] text-[#FF8A7A]">{error}</p>}
          </>
        )}
        <p className="text-center text-[12px] leading-[1.4] text-ink-3">
          Issued by a licensed partner. Availability depends on your country.
        </p>
      </div>
    </div>
  );
}
