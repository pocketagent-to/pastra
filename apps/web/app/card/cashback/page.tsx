import { AppShell } from '@/components/layout/AppShell';
import { EXAMPLE_CARD } from '@/lib/example';

const BOOSTS = [
  { axis: 'Gaming', merchant: '[PARTNER A]', rate: '8%', reason: 'You played 18h of CS2' },
  { axis: 'Crypto', merchant: '[PARTNER B]', rate: '[RATE]', reason: 'Top 12% in Crypto' },
];

/** F13 · Card — cashback and boosts (docs/product-spec.md section 9). */
export default function CardCashback() {
  return (
    <AppShell back="/card" title="Cashback">
      <div className="space-y-6 pt-2">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-panel border border-divider bg-panel p-4">
            <div className="text-xs uppercase tracking-widest text-ink-3">This week</div>
            <div className="font-head text-2xl font-extrabold text-green">
              ${EXAMPLE_CARD.weeklyCashback}
            </div>
          </div>
          <div className="rounded-panel border border-divider bg-panel p-4">
            <div className="text-xs uppercase tracking-widest text-ink-3">All time</div>
            <div className="font-head text-2xl font-extrabold">$42.18</div>
          </div>
        </div>

        <section className="space-y-2">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Active boosts</h2>
          {BOOSTS.map((b) => (
            <div key={b.merchant} className="rounded-panel border border-divider bg-panel p-4">
              <div className="flex items-center justify-between">
                <span className="font-semibold">{b.merchant}</span>
                <span className="font-head font-extrabold text-orange">{b.rate}</span>
              </div>
              <div className="text-xs text-ink-3">
                {b.axis} · {b.reason}
              </div>
            </div>
          ))}
        </section>

        <div className="rounded-panel border border-divider bg-panel p-4 text-sm text-ink-2">
          <p className="font-semibold text-ink">How boosts work</p>
          <ol className="mt-2 list-decimal space-y-1 pl-4">
            <li>Activate an offer here.</li>
            <li>Pay with your Hextra card at the merchant.</li>
            <li>Cashback lands on your card balance.</li>
          </ol>
        </div>
      </div>
    </AppShell>
  );
}
