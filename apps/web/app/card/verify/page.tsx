import { AppShell } from '@/components/layout/AppShell';
import { PrimaryButton } from '@/components/ui/Button';
import { SUPPORTED_COUNTRIES_DEFAULT } from '@pastra/card';

const STEPS = ['Photo of your document', 'A selfie', 'Proof of address', 'Your phone number'];

/** F3 · Card — verify identity (country select + KYC steps, docs/product-spec.md section 9). */
export default function CardVerify() {
  return (
    <AppShell back="/card" title="Verify identity">
      <div className="space-y-6 pt-2">
        <p className="text-sm text-ink-2">
          Your card is issued through Wirex. Verification is done by Wirex (SumSub); we only receive
          your status.
        </p>

        <label className="block space-y-1">
          <span className="text-xs uppercase tracking-widest text-ink-3">Country of residence</span>
          <select className="w-full rounded-button border border-divider bg-panel p-3 text-sm">
            {SUPPORTED_COUNTRIES_DEFAULT.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <ol className="space-y-2">
          {STEPS.map((s, i) => (
            <li
              key={s}
              className="flex items-center gap-3 rounded-tile border border-divider bg-panel p-3"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-sm">
                {i + 1}
              </span>
              <span className="text-sm">{s}</span>
            </li>
          ))}
        </ol>

        <PrimaryButton href="/card/verify/status">Start verification</PrimaryButton>
      </div>
    </AppShell>
  );
}
