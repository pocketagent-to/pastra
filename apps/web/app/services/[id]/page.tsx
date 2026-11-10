import { notFound } from 'next/navigation';
import { catalog, type ProviderId } from '@pastra/catalog';
import { getUserConnections } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { StatusChip } from '@/components/ui/StatusChip';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { getDb } from '@/lib/server';
import { requireUser } from '@/lib/data';

export const dynamic = 'force-dynamic';

/** C2/C3 · Service — connected / reconnect (docs/product-spec.md section 12). */
export default async function ServiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = catalog.providerById.get(id as ProviderId);
  if (!provider) notFound();

  const user = await requireUser();
  const conns = await getUserConnections(getDb(), user.id);
  const conn = conns.find((c) => c.provider === provider.id);

  return (
    <AppShell back="/services" title={provider.name}>
      <div className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <ServiceLogo provider={provider.id} name={provider.name} size={48} />
          <div className="flex-1">
            <div className="font-head text-lg font-bold">{provider.name}</div>
            <div className="text-xs text-ink-3 capitalize">{provider.axis}</div>
          </div>
          {conn && (
            <StatusChip variant={conn.status === 'connected' ? 'live' : 'warning'}>
              {conn.status === 'connected' ? 'Connected' : 'Reconnect'}
            </StatusChip>
          )}
        </div>

        {conn ? (
          <>
            <div className="rounded-panel border border-divider bg-panel p-4 text-sm text-ink-2">
              <div className="flex justify-between py-1">
                <span>Last synced</span>
                <span>{conn.lastSyncedWeek ?? '—'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span>Metrics read</span>
                <span>{provider.metrics.length}</span>
              </div>
            </div>
            {conn.status !== 'connected' && (
              <PrimaryButton href={`/api/connections/${provider.id}/begin`}>
                Reconnect
              </PrimaryButton>
            )}
            <OutlineButton href={`/services/${provider.id}/disconnect`}>Disconnect</OutlineButton>
          </>
        ) : (
          <>
            <p className="text-sm text-ink-2">
              Connect {provider.name} to grow your {provider.axis} side.
            </p>
            <PrimaryButton href={`/services/${provider.id}/connect`}>
              Connect {provider.name}
            </PrimaryButton>
          </>
        )}
      </div>
    </AppShell>
  );
}
