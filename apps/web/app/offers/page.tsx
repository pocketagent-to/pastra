import { AppShell } from '@/components/layout/AppShell';
import { DropTimer } from '@/components/ui/DropTimer';
import { OfferCard } from '@/components/ui/OfferCard';
import { EXAMPLE_OFFERS, EXAMPLE_PASS } from '@/lib/example';

/** D1 · Offers — this week's offers (docs/product-spec.md section 12). */
export default function OffersScreen() {
  return (
    <AppShell tab>
      <div className="space-y-5 pt-2">
        <div className="flex items-center justify-between">
          <h1 className="font-head text-2xl font-extrabold">Offers</h1>
        </div>
        <DropTimer nextDropAt={EXAMPLE_PASS.nextDropAt} serverNow={EXAMPLE_PASS.serverNow} />
        <div className="space-y-3">
          {EXAMPLE_OFFERS.map((o) => (
            <OfferCard key={o.id} {...o} />
          ))}
        </div>
        <p className="text-center text-xs text-ink-3">
          Offers refresh every Monday. They are based on your activity — manage this in Settings.
        </p>
      </div>
    </AppShell>
  );
}
