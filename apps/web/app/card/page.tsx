import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { CardFace } from '@/components/card/CardFace';
import { StatusChip } from '@/components/ui/StatusChip';
import { EXAMPLE_CARD, EXAMPLE_PASS } from '@/lib/example';
import { requireUser } from '@/lib/data';

export const dynamic = 'force-dynamic';

const ACTIONS = [
  { href: '/card/top-up', label: 'Top up' },
  { href: '/card/details', label: 'Details' },
  { href: '/card', label: 'Freeze' },
  { href: '/card/cashback', label: 'Cashback' },
];

/** F5 · Card — active (docs/product-spec.md section 9). */
export default async function CardScreen() {
  const user = await requireUser();
  const card = EXAMPLE_CARD;
  return (
    <AppShell tab>
      <div className="space-y-5 pt-2">
        <CardFace
          name={user.handle ?? EXAMPLE_PASS.handle}
          level={EXAMPLE_PASS.level}
          rarity={EXAMPLE_PASS.rarity}
          last4={card.last4}
        />

        <div className="rounded-panel border border-divider bg-panel p-4">
          <div className="text-xs uppercase tracking-widest text-ink-3">Available to spend</div>
          <div className="font-head text-3xl font-extrabold">
            ${card.balance} <span className="text-base text-ink-3">{card.currency}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {ACTIONS.map((a) => (
            <Link
              key={a.label}
              href={a.href}
              className="flex min-h-16 flex-col items-center justify-center rounded-tile border border-divider bg-panel text-xs font-semibold"
            >
              {a.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center justify-between rounded-panel border border-divider bg-panel p-4">
          <div>
            <div className="text-sm font-semibold">{card.boosts} boosts active this week</div>
            <div className="text-xs text-ink-3">Cashback this week · ${card.weeklyCashback}</div>
          </div>
          <StatusChip>Live</StatusChip>
        </div>

        <section className="space-y-2">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Recent</h2>
          <div className="divide-y divide-divider rounded-panel border border-divider bg-panel">
            {card.recent.map((t, i) => (
              <div key={i} className="flex items-center justify-between p-3">
                <div>
                  <div className="text-sm font-semibold">{t.merchant}</div>
                  <div className="text-xs text-ink-3">{t.at}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm">−${t.amount}</div>
                  {t.cashback && <div className="text-xs text-green">+${t.cashback} back</div>}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
