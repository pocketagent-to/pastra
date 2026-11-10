import { currentWeek } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { DropTimer } from '@/components/ui/DropTimer';
import { OfferCard } from '@/components/ui/OfferCard';
import { requireUser } from '@/lib/data';
import { EXAMPLE_OFFERS, EXAMPLE_PASS } from '@/lib/example';

export const dynamic = 'force-dynamic';

/** D1 · Offers — this week's offers (docs/product-spec.md section 12). */
export default async function OffersScreen() {
  await requireUser();
  const weekNumber = currentWeek().split('-W')[1] ?? '';

  return (
    <AppShell tab>
      <div className="space-y-5 pt-2">
        <div className="flex flex-col items-center gap-3.5 text-center">
          <span className="rounded-[10px] bg-blue px-3.5 py-1.5 font-head text-xs font-bold tracking-[0.06em]">
            WEEK {weekNumber}
          </span>
          <h1 className="text-gradient font-head text-2xl font-extrabold uppercase leading-tight">
            New offers drop in
          </h1>
          <DropTimer nextDropAt={EXAMPLE_PASS.nextDropAt} serverNow={EXAMPLE_PASS.serverNow} />
        </div>

        <div className="space-y-1">
          <h2 className="font-head text-lg font-extrabold uppercase">Your offers</h2>
          <p className="text-sm text-ink-2">Picked from your activity last week</p>
        </div>

        <div className="space-y-3">
          {EXAMPLE_OFFERS.map((o) => (
            <OfferCard key={o.id} {...o} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}
