import { AppShell } from '@/components/layout/AppShell';

/** G5 · Terms (draft — needs a lawyer; placeholders stay). */
export default function Terms() {
  return (
    <AppShell back="/settings" title="Terms">
      <div className="space-y-4 pt-2 text-sm text-ink-2">
        <p className="rounded-button border border-orange/40 bg-orange/10 px-3 py-2 text-orange-light">
          Draft — these terms are placeholders pending legal review.
        </p>
        <p>
          Pastra is operated by [ISSUER LEGAL NAME] (&ldquo;we&rdquo;). By creating a pass you agree
          to these Terms. You must be at least [MINIMUM AGE] years old.
        </p>
        <h2 className="font-head text-base font-bold text-ink">Your pass</h2>
        <p>
          You connect services you own. We read only the metrics listed on each consent screen and
          never your passwords, messages or balances.
        </p>
        <h2 className="font-head text-base font-bold text-ink">The card</h2>
        <p>
          The Pastra card is a Visa card issued through Wirex. Funds are held in your own wallet; we
          never move money on your behalf. Fees and limits are shown before you confirm.
        </p>
        <h2 className="font-head text-base font-bold text-ink">Contact</h2>
        <p>Questions? [your-domain]/support.</p>
      </div>
    </AppShell>
  );
}
