import { notFound } from 'next/navigation';
import { catalog, type Axis } from '@pastra/catalog';
import { AppShell } from '@/components/layout/AppShell';
import { PartBar } from '@/components/ui/PartBar';
import { ServiceTile } from '@/components/ui/ServiceTile';
import { AXIS_LABEL } from '@/lib/axes';
import { cn } from '@/lib/cn';
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
      <div className="space-y-[22px] pt-2">
        <div className="flex items-end justify-between gap-3">
          <div className="font-head text-[72px] font-extrabold leading-[0.95]">{info.score}</div>
          <div className="flex flex-col items-end gap-1.5">
            {info.topPct !== null && (
              <span className="rounded-[10px] bg-blue px-3 py-1.5 font-head text-xs font-bold uppercase">
                Top {info.topPct}%
              </span>
            )}
            {info.delta !== 0 && (
              <span
                className={cn(
                  'text-[13px] font-semibold',
                  info.delta > 0 ? 'text-green' : 'text-orange-light',
                )}
              >
                {info.delta > 0 ? `+${info.delta}` : info.delta} this week
              </span>
            )}
          </div>
        </div>

        <section className="space-y-4 rounded-panel bg-panel p-[18px]">
          <PartBar label="Volume" value={Math.min(100, info.score + 2)} />
          <PartBar label="Activity" value={Math.max(0, info.score - 6)} />
          <PartBar label="Depth" value={info.score} />
        </section>

        {unconnected.length > 0 && (
          <section className="space-y-3">
            <h2 className="font-head text-lg font-extrabold uppercase">Grow this side</h2>
            <div className="flex flex-col gap-3">
              {unconnected.map((p) => (
                <ServiceTile
                  key={p.id}
                  variant="grow"
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
