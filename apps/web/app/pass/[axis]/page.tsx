import { notFound } from 'next/navigation';
import { catalog, type Axis } from '@pastra/catalog';
import { AppShell } from '@/components/layout/AppShell';
import { PartBar } from '@/components/ui/PartBar';
import { ServiceTile } from '@/components/ui/ServiceTile';
import { AXIS_LABEL } from '@/lib/axes';
import { EXAMPLE_PASS } from '@/lib/example';

const AXES: Axis[] = ['sports', 'gaming', 'crypto', 'music', 'social', 'lifestyle'];
const CONNECTED = new Set(['steam', 'wallet_evm', 'discord', 'tidal', 'x']);

/** B3 · Side detail (docs/product-spec.md section 12). */
export default async function Category({ params }: { params: Promise<{ axis: string }> }) {
  const { axis } = await params;
  if (!AXES.includes(axis as Axis)) notFound();
  const a = axis as Axis;
  const info = EXAMPLE_PASS.axes[a];
  const providers = catalog.providersByAxis.get(a) ?? [];
  const unconnected = providers.filter((p) => !CONNECTED.has(p.id));

  return (
    <AppShell back="/pass" title={AXIS_LABEL[a]}>
      <div className="space-y-6 pt-2">
        <div className="flex items-end justify-between rounded-panel border border-divider bg-panel p-4">
          <div>
            <div className="font-head text-5xl font-extrabold">{info.score}</div>
            {info.topPct !== null && <div className="text-sm text-green">Top {info.topPct}%</div>}
          </div>
          {info.delta !== 0 && (
            <div className={info.delta > 0 ? 'text-green' : 'text-orange-light'}>
              {info.delta > 0 ? `+${info.delta}` : info.delta} this week
            </div>
          )}
        </div>

        <section className="space-y-3 rounded-panel border border-divider bg-panel p-4">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Parts</h2>
          <PartBar label="Volume" value={Math.min(100, info.score + 2)} />
          <PartBar label="Activity" value={Math.max(0, info.score - 6)} />
          <PartBar label="Depth" value={info.score} />
        </section>

        {unconnected.length > 0 && (
          <section className="space-y-2">
            <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">
              Grow this side
            </h2>
            <div className="grid grid-cols-2 gap-2">
              {unconnected.map((p) => (
                <ServiceTile
                  key={p.id}
                  provider={p.id}
                  name={p.name}
                  state={p.status === 'coming_soon' ? 'coming_soon' : 'connect'}
                  href={p.status === 'coming_soon' ? undefined : `/services/${p.id}/connect`}
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
}
