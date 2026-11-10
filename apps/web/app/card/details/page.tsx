import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import { Toggle } from '@/components/ui/Toggle';
import { OutlineButton } from '@/components/ui/Button';

/** F10 · Card — details and management (docs/product-spec.md section 9). */
export default function CardDetails() {
  return (
    <AppShell back="/card" title="Card details">
      <div className="space-y-6 pt-2">
        <OutlineButton href="/card/details/confirm">Show card number</OutlineButton>

        <section className="divide-y divide-divider rounded-panel border border-divider bg-panel">
          <div className="flex items-center justify-between p-4">
            <span className="text-sm">Count card activity in my pass</span>
            <Toggle defaultOn />
          </div>
          <div className="flex items-center justify-between p-4">
            <span className="text-sm">Payment notifications on Telegram</span>
            <Toggle defaultOn />
          </div>
        </section>

        <section className="rounded-panel border border-divider bg-panel p-4 text-sm text-ink-2">
          <div className="flex justify-between py-1">
            <span>Daily limit</span>
            <span>[CARD_DEFAULT_DAILY_LIMIT]</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Base FX</span>
            <span>1.00%</span>
          </div>
          <div className="flex justify-between py-1">
            <span>Issuer</span>
            <span>[ISSUER LEGAL NAME]</span>
          </div>
        </section>

        <div className="space-y-2">
          <Link href="/card/withdraw" className="block text-sm text-ink-2">
            Withdraw balance
          </Link>
          <Link href="/card/close" className="block text-sm text-orange-light">
            Close card
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
