import { AppShell } from '@/components/layout/AppShell';
import { PromoCode } from '@/components/ui/PromoCode';

const NETWORKS = ['Base', 'Ethereum', 'Arbitrum', 'Optimism', 'Polygon', 'BSC', 'Solana'];

/** F7 · Card — top up (USDC / EURC only, docs/product-spec.md section 9, 10 Nov). */
export default function CardTopUp() {
  return (
    <AppShell back="/card" title="Top up">
      <div className="space-y-6 pt-2">
        <div className="flex gap-2">
          <span className="rounded-chip bg-blue/20 px-3 py-1 text-sm font-semibold text-blue">
            USDC
          </span>
          <span className="rounded-chip border border-divider px-3 py-1 text-sm text-ink-2">
            EURC
          </span>
        </div>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-widest text-ink-3">Network</span>
          <select className="w-full rounded-button border border-divider bg-panel p-3 text-sm">
            {NETWORKS.map((n) => (
              <option key={n}>{n}</option>
            ))}
          </select>
        </label>

        <div className="space-y-2">
          <span className="text-xs uppercase tracking-widest text-ink-3">Deposit address</span>
          <PromoCode code="0xDEP…a1b2" />
          <p className="text-xs text-ink-3">
            Send only USDC on the selected network. Minimum 1 USD. Credited in 1–15 minutes. EURC is
            accepted on Base only.
          </p>
        </div>

        <div className="rounded-panel border border-divider bg-panel p-4 text-sm text-ink-2">
          <div className="flex justify-between py-1">
            <span>Fee</span>
            <span>[FEE]</span>
          </div>
          <div className="flex justify-between py-1">
            <span>You receive</span>
            <span>[AMOUNT]</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
