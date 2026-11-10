import { catalog, type Axis } from '@pastra/catalog';
import { AppShell } from '@/components/layout/AppShell';
import { ServiceTile, type TileState } from '@/components/ui/ServiceTile';
import { AXIS_LABEL } from '@/lib/axes';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';

// Example per-user connection states (replaced by live data once the app reads from core).
const CONNECTED = new Set(['steam', 'wallet_evm', 'discord']);
const RECONNECT = new Set(['x']);

/** C1 · Services — the catalog grouped by axis (docs/product-spec.md section 12). */
export default function ServicesScreen() {
  const liveCount = catalog.providers.filter((p) => p.status === 'live').length;

  return (
    <AppShell tab>
      <div className="space-y-6 pt-2">
        <div>
          <h1 className="font-head text-2xl font-extrabold">Services</h1>
          <p className="text-sm text-ink-3">
            {CONNECTED.size} of {liveCount} connected
          </p>
        </div>

        {HEX_AXIS_ORDER.map((axis: Axis) => {
          const providers = catalog.providersByAxis.get(axis) ?? [];
          return (
            <section key={axis} className="space-y-2">
              <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">
                {AXIS_LABEL[axis]}
              </h2>
              <div className="grid grid-cols-2 gap-2">
                {providers.map((p) => {
                  let state: TileState = 'connect';
                  if (p.status === 'coming_soon') state = 'coming_soon';
                  else if (CONNECTED.has(p.id)) state = 'connected';
                  else if (RECONNECT.has(p.id)) state = 'reconnect';
                  return (
                    <ServiceTile
                      key={p.id}
                      provider={p.id}
                      name={p.name}
                      state={state}
                      href={state === 'coming_soon' ? undefined : `/services/${p.id}`}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>
    </AppShell>
  );
}
