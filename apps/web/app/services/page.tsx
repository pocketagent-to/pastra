import { catalog, type Axis } from '@pastra/catalog';
import { AppShell } from '@/components/layout/AppShell';
import { ServiceTile, type TileState } from '@/components/ui/ServiceTile';
import { AXIS_LABEL } from '@/lib/axes';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { getConnectionState, requireUser } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** C1 · Services — the catalog grouped by axis, with live connection states. */
export default async function ServicesScreen() {
  const user = await requireUser();
  const state = await getConnectionState(user.id);
  const liveCount = catalog.providers.filter((p) => p.status === 'live').length;
  const connectedCount = [...state.values()].filter((s) => s === 'connected').length;

  return (
    <AppShell tab>
      <div className="space-y-6 pt-2">
        <div>
          <h1 className="font-head text-2xl font-extrabold">Services</h1>
          <p className="text-sm text-ink-3">
            {connectedCount} of {liveCount} connected
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
                  const status = state.get(p.id);
                  let tile: TileState = 'connect';
                  if (p.status === 'coming_soon' && !status) tile = 'coming_soon';
                  else if (status === 'connected') tile = 'connected';
                  else if (status === 'needs_reconnect' || status === 'error') tile = 'reconnect';
                  return (
                    <ServiceTile
                      key={p.id}
                      provider={p.id}
                      name={p.name}
                      state={tile}
                      href={tile === 'coming_soon' ? undefined : `/services/${p.id}`}
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
