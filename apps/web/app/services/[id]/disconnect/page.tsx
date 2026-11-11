import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog, type ProviderId } from '@pastra/catalog';
import { currentWeek, disconnectPreview, getUserConnections } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { AXIS_LABEL } from '@/lib/axes';
import { requireUser } from '@/lib/data';
import { coreDeps, getDb } from '@/lib/server';

export const dynamic = 'force-dynamic';

/**
 * C4 · Disconnect confirm (design/DisconnectConfirm.html, docs/product-spec.md section 12). Shows
 * exactly what changes before the user disconnects: the axis score falls, the level stays, stamps
 * and offers from this service end. The whatIf delta comes from the pure scorer via disconnectPreview.
 *
 * The `[id]` segment carries the provider id (the repo's services convention), resolved to the
 * user's connection here so the preview and the form target the right service.
 */
export default async function DisconnectConfirm({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const provider = catalog.providerById.get(id as ProviderId);
  if (!provider) notFound();

  const user = await requireUser();
  const conns = await getUserConnections(getDb(), user.id);
  const conn = conns.find((c) => c.provider === provider.id);
  if (!conn) notFound();

  const week = currentWeek();
  const preview = await disconnectPreview(coreDeps(), {
    userId: user.id,
    connectionId: conn.id,
    week,
  });

  const axis = provider.axis;
  const before = Math.round(preview.before.axes[axis].score);
  const after = Math.round(preview.after.axes[axis].score);

  return (
    <AppShell back={`/services/${provider.id}`} title="Disconnect">
      <div className="flex flex-1 flex-col gap-[22px] pt-2">
        <div className="flex flex-col gap-2.5">
          <div className="font-head text-2xl font-extrabold uppercase leading-[1.2]">
            Disconnect {provider.name}?
          </div>
          <div className="text-[15px] leading-relaxed text-ink-2">
            Here&rsquo;s what changes right away.
          </div>
        </div>

        <div className="flex flex-col rounded-panel bg-panel px-4">
          <div className="flex min-h-[52px] items-center text-[14px]">
            Everything we read from {provider.name} is deleted
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider text-[14px]">
            <span>Your {AXIS_LABEL[axis]} side</span>
            <span className="font-head font-bold">
              {before} <span className="text-[#FF8A57]">&rarr; {after}</span>
            </span>
          </div>
          <div className="flex min-h-[52px] items-center justify-between gap-3 border-t border-divider text-[14px]">
            <span>Your level</span>
            <span className="font-head font-bold">
              {preview.before.level} <span className="text-green">stays</span>
            </span>
          </div>
          <div className="flex min-h-[52px] items-center border-t border-divider text-[14px]">
            Stamps earned from {provider.name} are removed
          </div>
          <div className="flex min-h-[52px] items-center border-t border-divider text-[14px]">
            Offers unlocked by {provider.name} end with this drop
          </div>
        </div>

        <div className="text-[13px] leading-relaxed text-ink-3">
          You can reconnect any time. Your numbers come back with the next sync.
        </div>

        <div className="mt-auto flex flex-col gap-2.5">
          <form action={`/api/connections/${provider.id}/disconnect`} method="post">
            <button
              type="submit"
              className="flex h-14 w-full items-center justify-center rounded-button border-[1.5px] border-[#FF8A7A] font-head text-[13px] font-bold uppercase tracking-[0.03em] text-[#FF8A7A]"
            >
              Disconnect and delete
            </button>
          </form>
          <Link
            href={`/services/${provider.id}`}
            className="flex h-14 items-center justify-center rounded-button bg-[#1F4BFF] font-head text-[14px] font-bold uppercase tracking-[0.03em] text-white"
          >
            Keep connected
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
