import { AppShell } from '@/components/layout/AppShell';
import { PrimaryButton } from '@/components/ui/Button';

/** F14 · Card — close (requires a zero balance, docs/architecture.md section 19). */
export default function CardClose() {
  return (
    <AppShell back="/card/details" title="Close card">
      <div className="space-y-5 pt-2">
        <p className="rounded-button border border-orange/40 bg-orange/10 px-3 py-2 text-sm text-orange-light">
          Closing a card is permanent. You must withdraw your balance to zero first.
        </p>
        <ul className="space-y-1 text-sm text-ink-2">
          <li>• Your card stops working immediately.</li>
          <li>• Active boosts end.</li>
          <li>• You can issue a new card later.</li>
        </ul>
        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-widest text-ink-3">
            Type CLOSE to confirm
          </span>
          <input className="w-full rounded-button border border-divider bg-panel p-3 uppercase" />
        </label>
        <PrimaryButton href="/card">Close card</PrimaryButton>
      </div>
    </AppShell>
  );
}
