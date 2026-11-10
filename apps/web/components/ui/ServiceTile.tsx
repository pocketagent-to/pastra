import Link from 'next/link';
import type { ProviderId } from '@pastra/catalog';
import { ServiceLogo } from './ServiceLogo';
import { cn } from '@/lib/cn';

export type TileState = 'connect' | 'connected' | 'reconnect' | 'coming_soon';
export type TileVariant = 'tile' | 'grow';

const STATE_LABEL: Record<TileState, string> = {
  connect: 'Connect',
  connected: 'Connected',
  reconnect: 'Reconnect',
  coming_soon: 'Coming soon',
};

const STATE_CLASS: Record<TileState, string> = {
  connect: 'text-ink-2',
  connected: 'text-green',
  reconnect: 'text-orange-light',
  coming_soon: 'text-ink-3',
};

/** Leading action verb on a "Grow this side" row, or null when the service offers none. */
const GROW_ACTION: Record<TileState, string | null> = {
  connect: 'Connect',
  reconnect: 'Reconnect',
  connected: null,
  coming_soon: null,
};

/**
 * A service tile with its four states.
 *
 * - `variant="tile"` (default): the 2-column logo tile on Services / Grow this side.
 * - `variant="grow"`: the full-width white-bordered row on a side's "Grow this side" list
 *   (design/Category.html) — a title, an optional one-line description, and an optional
 *   "+N pts" hint on the right.
 */
export function ServiceTile({
  provider,
  name,
  state,
  href,
  variant = 'tile',
  description,
  points,
}: {
  provider: ProviderId;
  name: string;
  state: TileState;
  href?: string;
  variant?: TileVariant;
  /** Grow row only: one-line description under the title. Optional. */
  description?: string;
  /** Grow row only: points gained by connecting, shown as "+N pts" on the right. Optional. */
  points?: number;
}) {
  const inner =
    variant === 'grow' ? (
      <div
        className={cn(
          'flex min-h-[60px] items-center justify-between gap-3 rounded-tile border-[1.5px] border-ink px-4 py-3',
          state === 'coming_soon' && 'opacity-70',
        )}
      >
        <span className="flex min-w-0 flex-col gap-[3px]">
          <span className="truncate text-[15px] font-semibold">
            {GROW_ACTION[state] ? `${GROW_ACTION[state]} ${name}` : name}
          </span>
          {description && <span className="text-xs text-ink-2">{description}</span>}
        </span>
        {points !== undefined && (
          <span className="shrink-0 font-head text-xs font-bold text-orange-light">
            +{points} pts
          </span>
        )}
      </div>
    ) : (
      <div
        className={cn(
          'flex items-center gap-3 rounded-tile border border-divider bg-panel p-3',
          state === 'coming_soon' && 'opacity-70',
        )}
      >
        <ServiceLogo provider={provider} name={name} size={40} />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{name}</div>
          <div className={cn('text-xs', STATE_CLASS[state])}>{STATE_LABEL[state]}</div>
        </div>
      </div>
    );

  return href ? (
    <Link href={href} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}
