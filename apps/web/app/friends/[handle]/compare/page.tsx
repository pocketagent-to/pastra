import Link from 'next/link';
import { notFound } from 'next/navigation';
import { catalog } from '@pastra/catalog';
import { compareFriends, currentWeek } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { Hexagon } from '@/components/ui/Hexagon';
import { cn } from '@/lib/cn';
import { AXIS_SHORT } from '@/lib/axes';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';

/** E5 · Compare two passes (docs/product-spec.md section 12). */
export default async function Compare({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const user = await requireUser();
  const view = await compareFriends(getDb(), catalog, user.id, handle, currentWeek());
  if (!view) notFound();

  const mine = view.me.axes;
  const friend = view.friend.axes;
  return (
    <AppShell tab>
      <div className="flex flex-col gap-5 pt-1">
        <Link
          href="/friends"
          className="flex min-h-11 items-center gap-2 text-sm font-semibold text-ink-2"
        >
          <svg
            viewBox="0 0 24 24"
            width="20"
            height="20"
            aria-hidden="true"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M11 6l-6 6 6 6" />
          </svg>
          All friends
        </Link>

        <div className="flex items-center justify-between gap-2.5">
          <div className="flex flex-col gap-1">
            <div className="font-head text-xl font-extrabold uppercase text-[#7C9BFF]">
              {view.me.handle}
            </div>
            <div className="text-xs text-ink-2">LVL {view.me.level} · solid line</div>
          </div>
          <div className="font-head text-sm font-bold text-ink-3">VS</div>
          <div className="flex flex-col items-end gap-1">
            <div className="font-head text-xl font-extrabold uppercase text-orange">
              {view.friend.handle}
            </div>
            <div className="text-xs text-ink-2">dashed line</div>
          </div>
        </div>

        <div className="rounded-panel bg-panel p-4">
          <div className="flex justify-center">
            <Hexagon values={mine} compare={friend} size={300} />
          </div>
        </div>

        <div className="divide-y divide-divider rounded-panel bg-panel px-4">
          {HEX_AXIS_ORDER.map((axis) => {
            const myVal = mine[axis];
            const friendVal = friend[axis] ?? 0;
            const meLeads = myVal >= friendVal;
            return (
              <div key={axis} className="flex h-[46px] items-center">
                <div
                  className={cn(
                    'w-11 font-head text-[15px]',
                    meLeads ? 'font-bold text-[#7C9BFF]' : 'font-medium text-ink-3',
                  )}
                >
                  {myVal}
                </div>
                <div className="flex-grow text-center font-head text-[11px] font-bold uppercase tracking-[0.05em]">
                  {AXIS_SHORT[axis]}
                </div>
                <div
                  className={cn(
                    'w-11 text-right font-head text-[15px]',
                    meLeads ? 'font-medium text-ink-3' : 'font-bold text-orange',
                  )}
                >
                  {friendVal}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5">
          <Link
            href="/share"
            className="flex h-14 items-center justify-center rounded-button bg-orange font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
          >
            Post the comparison
          </Link>
          <Link
            href="/friends/add"
            className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em] text-ink"
          >
            Invite another friend
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
