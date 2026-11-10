import { AppShell } from '@/components/layout/AppShell';
import { StatusChip } from '@/components/ui/StatusChip';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** F4 · Card — verification states (In review shown; one state at a time). */
export default function CardVerifyStatus() {
  return (
    <AppShell back="/card" title="Verification">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <StatusChip variant="warning">In review</StatusChip>
        <h1 className="font-head text-2xl font-extrabold">We&rsquo;re checking your details</h1>
        <p className="max-w-xs text-sm text-ink-2">
          This usually takes a few minutes. We&rsquo;ll notify you when your card is ready.
        </p>
        <div className="w-full max-w-xs space-y-3 pt-4">
          <PrimaryButton href="/card">Back to card</PrimaryButton>
          <OutlineButton href="/card/verify">Try again</OutlineButton>
        </div>
      </div>
    </AppShell>
  );
}
