import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { DropTimer } from '@/components/ui/DropTimer';
import { OfferCard } from '@/components/ui/OfferCard';
import { requireUser } from '@/lib/data';
import { getOffersScreenData } from '@/lib/offers';

export const dynamic = 'force-dynamic';

/** D1 · Offers — this week's offers (docs/product-spec.md section 12). */
export default async function OffersScreen() {
  const user = await requireUser();
  const { offers, week, nextDropAt, serverNow } = await getOffersScreenData(user.id);
  const weekNumber = week.split('-W')[1] ?? '';

  if (offers.length === 0) {
    return <OffersEmpty weekNumber={weekNumber} nextDropAt={nextDropAt} serverNow={serverNow} />;
  }

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
          <DropTimer nextDropAt={nextDropAt} serverNow={serverNow} />
        </div>

        <div className="space-y-1">
          <h2 className="font-head text-lg font-extrabold uppercase">Your offers</h2>
          <p className="text-sm text-ink-2">Picked from your activity last week</p>
        </div>

        <div className="space-y-3">
          {offers.map((o) => (
            <OfferCard key={o.id} {...o} />
          ))}
        </div>
      </div>
    </AppShell>
  );
}

/** Format the remaining time to the drop as the empty-week panel shows it, e.g. "2d 14h 09m". */
function formatCountdown(nextDropAt: string, serverNow: string): string {
  const totalMinutes = Math.max(
    0,
    Math.floor((new Date(nextDropAt).getTime() - new Date(serverNow).getTime()) / 60_000),
  );
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return `${days}d ${hours}h ${String(minutes).padStart(2, '0')}m`;
}

/** D · OffersEmpty — a quiet week with no offers (design/OffersEmpty.html). */
function OffersEmpty({
  weekNumber,
  nextDropAt,
  serverNow,
}: {
  weekNumber: string;
  nextDropAt: string;
  serverNow: string;
}) {
  return (
    <AppShell tab className="flex flex-col">
      <div className="flex flex-1 flex-col gap-[22px] pt-3">
        <div className="flex flex-col items-start gap-3">
          <span className="rounded-[10px] bg-blue px-3.5 py-1.5 font-head text-xs font-bold tracking-[0.06em]">
            WEEK {weekNumber}
          </span>
          <h1 className="font-head text-[26px] font-extrabold uppercase leading-[1.15]">
            No offers this week
          </h1>
          <p className="text-[15px] leading-relaxed text-ink-2">
            Offers unlock from what you did last week. A quiet week means a quiet drop.
          </p>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-panel border border-[#1F2C6B] bg-[#0B1238] p-[18px]">
          <span className="text-sm text-ink-2">Next drop in</span>
          <span className="font-head text-[22px] font-extrabold">
            {formatCountdown(nextDropAt, serverNow)}
          </span>
        </div>

        <div className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold tracking-[0.05em]">
            HOW TO UNLOCK MORE
          </div>
          <div className="flex flex-col rounded-panel bg-panel px-4 py-1">
            <div className="flex min-h-[52px] items-center text-sm">
              Stay active in the services you connected
            </div>
            <div className="flex min-h-[52px] items-center border-t border-divider text-sm">
              Connect more services to open more categories
            </div>
            <div className="flex min-h-[52px] items-center border-t border-divider text-sm">
              Turn on offers in Settings if they are off
            </div>
          </div>
        </div>

        <Link
          href="/services"
          className="mt-auto flex h-14 items-center justify-center rounded-button bg-orange font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
        >
          Connect services
        </Link>
      </div>
    </AppShell>
  );
}
