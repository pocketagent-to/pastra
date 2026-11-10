import Link from 'next/link';
import type { ProviderId } from '@pastra/catalog';
import { ServiceLogo } from './ServiceLogo';
import { cn } from '@/lib/cn';

export type TileState = 'connect' | 'connected' | 'reconnect' | 'coming_soon';

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

/** A service tile on Services / Grow this side, with its four states. */
export function ServiceTile({
  provider,
  name,
  state,
  href,
}: {
  provider: ProviderId;
  name: string;
  state: TileState;
  href?: string;
}) {
  const inner = (
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
