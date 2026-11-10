import { AppShell } from '@/components/layout/AppShell';
import { PrimaryButton } from '@/components/ui/Button';

/** F8 · Card — withdraw to an external Base address (docs/architecture.md section 19). */
export default function CardWithdraw() {
  return (
    <AppShell back="/card/details" title="Withdraw">
      <div className="space-y-5 pt-2">
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-widest text-ink-3">Amount (USDC)</span>
          <input
            inputMode="decimal"
            placeholder="0.00"
            className="w-full rounded-button border border-divider bg-panel p-3 text-lg"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-widest text-ink-3">To address (Base)</span>
          <input
            placeholder="0x…"
            className="w-full rounded-button border border-divider bg-panel p-3 font-mono text-sm"
          />
        </label>
        <p className="text-xs text-ink-3">
          Withdrawals run on-chain in two steps with a 3-second delay, signed by your wallet. There
          is no cancel once signed.
        </p>
        <PrimaryButton href="/card/withdraw/demo">Review &amp; sign</PrimaryButton>
      </div>
    </AppShell>
  );
}
