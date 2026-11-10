import Link from 'next/link';
import type { Axis } from '@pastra/catalog';
import { AXIS_LABEL } from '@/lib/axes';
import { cn } from '@/lib/cn';

export type OfferState = 'available' | 'locked' | 'activated' | 'used' | 'expired';

export interface OfferCardProps {
  id: string;
  merchant: string;
  logoUrl?: string;
  headline: string;
  axis: Axis;
  reason?: string;
  endsLabel?: string;
  type: 'cashback' | 'promo';
  state: OfferState;
}

const ACTION: Record<OfferState, string> = {
  available: 'Activate',
  locked: 'Get the card',
  activated: 'Active until Monday',
  used: 'Cashback pending',
  expired: 'Expired',
};

/** An offer card with its five states (docs/product-spec.md section 8). */
export function OfferCard(props: OfferCardProps) {
  const { id, merchant, logoUrl, headline, axis, reason, endsLabel, type, state } = props;
  const action = type === 'promo' && state === 'available' ? 'Show code' : ACTION[state];
  const locked = state === 'locked';
  return (
    <Link
      href={locked ? '/card' : `/offers/${id}`}
      className="block rounded-panel border border-divider bg-panel p-4 hover:opacity-90"
    >
      <div className="flex items-center gap-3">
        {logoUrl ? (
          <img src={logoUrl} alt={merchant} width={40} height={40} className="rounded-xl" />
        ) : (
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 font-head font-bold">
            {merchant.charAt(0)}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{merchant}</div>
          <div className="text-xs text-ink-3">{AXIS_LABEL[axis]}</div>
        </div>
        <div className="font-head text-lg font-extrabold text-orange">{headline}</div>
      </div>
      {reason && <p className="mt-3 text-sm text-ink-2">{reason}</p>}
      <div className="mt-3 flex items-center justify-between">
        <span
          className={cn(
            'text-sm font-semibold',
            locked ? 'text-orange-light' : state === 'used' ? 'text-ink-2' : 'text-ink',
          )}
        >
          {locked && '🔒 '}
          {action}
        </span>
        {endsLabel && <span className="text-xs text-ink-3">{endsLabel}</span>}
      </div>
    </Link>
  );
}
