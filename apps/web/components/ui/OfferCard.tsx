import Link from 'next/link';
import type { Axis } from '@pastra/catalog';
import { AXIS_SHORT } from '@/lib/axes';

export type OfferState = 'available' | 'locked' | 'activated' | 'used' | 'paid' | 'expired';

export interface OfferCardProps {
  id: string;
  merchant: string;
  /** Kept for backward compatibility; the mockup card has no logo slot. */
  logoUrl?: string;
  headline: string;
  axis: Axis;
  reason?: string;
  /** Top-right status word for `available`/`expired` (e.g. "Ends Monday"). */
  endsLabel?: string;
  type: 'cashback' | 'promo';
  state: OfferState;
  /** Cashback amount string for `used`/`paid` footers, e.g. "1.92" (money is a string). */
  cashback?: string;
  /** Countdown label for the `activated` footer, e.g. "2d 14h". */
  activeLabel?: string;
}

/** The top-right status word per state. `available`/`expired` fall back to `endsLabel`. */
const STATUS_WORD: Partial<Record<OfferState, { text: string; className: string }>> = {
  locked: { text: 'card required', className: 'text-orange-light' },
  activated: { text: 'active', className: 'text-green' },
  used: { text: 'used', className: 'text-ink-2' },
  paid: { text: 'paid', className: 'text-green' },
};

const CheckIcon = (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    aria-hidden
    fill="none"
    stroke="currentColor"
    strokeWidth={2.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
  >
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </svg>
);

/**
 * An offer card in each of its states (docs/product-spec.md section 8).
 * The whole card links to the offer detail; a locked card routes to /card.
 */
export function OfferCard(props: OfferCardProps) {
  const { id, merchant, headline, axis, reason, endsLabel, type, state, cashback, activeLabel } =
    props;
  const locked = state === 'locked';
  const status =
    STATUS_WORD[state] ?? (endsLabel ? { text: endsLabel, className: 'text-ink-3' } : null);
  const reasonLine = reason ? `${reason} · ${merchant}` : merchant;
  const amount = cashback ? `+${cashback} ` : '';

  return (
    <Link
      href={locked ? '/card' : `/offers/${id}`}
      className="flex flex-col gap-3 rounded-panel bg-panel p-[18px] no-underline transition hover:opacity-90"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-lg bg-blue px-2.5 py-[5px] font-head text-[10px] font-bold uppercase tracking-[0.06em] text-ink">
          {AXIS_SHORT[axis]}
        </span>
        {status && (
          <span className={`text-xs font-semibold ${status.className}`}>{status.text}</span>
        )}
      </div>

      <div className="font-head text-base font-bold uppercase leading-tight text-ink">
        {headline}
      </div>

      <div className="text-sm text-ink-2">{reasonLine}</div>

      {state === 'available' && type === 'cashback' && (
        <span className="flex h-12 items-center justify-center rounded-[14px] bg-[image:var(--grad-button)] font-head text-xs font-bold uppercase tracking-[0.03em] text-on-orange">
          Activate
        </span>
      )}

      {state === 'available' && type === 'promo' && (
        <div className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 rounded-chip bg-status px-3.5 py-[9px] font-head text-[11px] font-bold text-[#04130A] shadow-[0_0_16px_rgba(46,204,113,0.45)]">
            <svg
              viewBox="0 0 20 20"
              width="18"
              height="18"
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M4 10l4 4 8-9" />
            </svg>
            Promo code ready
          </span>
          <span className="flex h-13 w-13 shrink-0 items-center justify-center rounded-full bg-orange text-on-orange">
            <svg
              viewBox="0 0 24 24"
              width="24"
              height="24"
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </span>
        </div>
      )}

      {state === 'locked' && (
        <span className="flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-ink font-head text-xs font-bold uppercase tracking-[0.03em] text-ink">
          <svg
            viewBox="0 0 24 24"
            width="18"
            height="18"
            aria-hidden
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="shrink-0 text-ink-2"
          >
            <rect x="5" y="11" width="14" height="9" rx="2" />
            <path d="M8 11V8a4 4 0 018 0v3" />
          </svg>
          Get the card
        </span>
      )}

      {state === 'activated' && (
        <div className="flex min-h-[44px] items-center gap-2 text-[13px] font-semibold text-green">
          {CheckIcon}
          Active until the next drop{activeLabel ? ` · ${activeLabel}` : ''}
        </div>
      )}

      {state === 'used' && (
        <div className="flex min-h-[44px] items-center gap-2 text-[13px] font-semibold text-orange-light">
          Cashback {amount}pending · lands when the payment settles
        </div>
      )}

      {state === 'paid' && (
        <div className="flex min-h-[44px] items-center gap-2 text-[13px] font-semibold text-green">
          {CheckIcon}
          Cashback {amount}is on your card
        </div>
      )}

      {state === 'expired' && (
        <div className="flex min-h-[44px] items-center text-[13px] font-semibold text-ink-3">
          Expired
        </div>
      )}
    </Link>
  );
}
