import Link from 'next/link';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { OutlineButton } from '@/components/ui/Button';
import type { ProviderId } from '@pastra/catalog';

// One service per axis to start (docs/product-spec.md section 4).
const FIRST: Array<{ id: ProviderId; name: string; axis: string }> = [
  { id: 'steam', name: 'Steam', axis: 'Gaming' },
  { id: 'wallet_evm', name: 'EVM wallet', axis: 'Crypto' },
  { id: 'x', name: 'X', axis: 'Social' },
  { id: 'tidal', name: 'TIDAL', axis: 'Music' },
  { id: 'polar', name: 'Polar', axis: 'Sports' },
];

/** A5 · First service (docs/product-spec.md section 12). */
export default function FirstConnect() {
  return (
    <main className="app-shell flex min-h-dvh flex-col gap-6 px-6 py-10">
      <div className="space-y-2 text-center">
        <h1 className="font-head text-2xl font-extrabold">Build your first side</h1>
        <p className="text-sm text-ink-2">Connect one service to reveal your pass.</p>
      </div>

      <div className="space-y-2">
        {FIRST.map((s) => (
          <Link
            key={s.id}
            href={`/services/${s.id}/connect`}
            className="flex items-center gap-3 rounded-tile border border-divider bg-panel p-3 hover:opacity-90"
          >
            <ServiceLogo provider={s.id} name={s.name} size={44} />
            <div className="flex-1">
              <div className="font-semibold">{s.name}</div>
              <div className="text-xs text-ink-3">{s.axis}</div>
            </div>
            <span className="text-ink-3">›</span>
          </Link>
        ))}
      </div>

      <OutlineButton href="/services">See all services</OutlineButton>
    </main>
  );
}
