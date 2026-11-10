import { AppShell } from '@/components/layout/AppShell';

/** G6 · Privacy (draft — needs a lawyer; placeholders stay). */
export default function Privacy() {
  return (
    <AppShell back="/settings" title="Privacy">
      <div className="space-y-4 pt-2 text-sm text-ink-2">
        <p className="rounded-button border border-orange/40 bg-orange/10 px-3 py-2 text-orange-light">
          Draft — this policy is a placeholder pending legal review.
        </p>
        <h2 className="font-head text-base font-bold text-ink">What we store</h2>
        <p>
          Final metrics and their weekly snapshots, encrypted access tokens, wallet addresses, and
          your KYC status and customer id at Wirex.
        </p>
        <h2 className="font-head text-base font-bold text-ink">What we never store</h2>
        <p>
          Raw service responses, passwords, wallet balances or amounts, heart rate or body
          measurements, server or place names, card numbers or security codes.
        </p>
        <h2 className="font-head text-base font-bold text-ink">Your rights</h2>
        <p>
          Download your data at any time, disconnect a service to erase its data immediately, or
          delete your account. Deleted data is removed within [RETENTION PERIOD].
        </p>
        <h2 className="font-head text-base font-bold text-ink">Partners</h2>
        <p>Merchants receive only aggregate counts. We never share your personal data with them.</p>
      </div>
    </AppShell>
  );
}
