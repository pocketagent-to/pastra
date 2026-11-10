import { AppShell } from '@/components/layout/AppShell';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** B8 · Share — done (docs/product-spec.md section 12). */
export default function ShareDone() {
  return (
    <AppShell back="/pass" title="Shared">
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-5xl">🎉</div>
        <h1 className="font-head text-2xl font-extrabold">Shared!</h1>
        <p className="max-w-xs text-sm text-ink-2">
          Your pass is out there. Invite a friend and you both get +5 points.
        </p>
        <div className="w-full max-w-xs space-y-3 pt-2">
          <PrimaryButton href="/friends/add">Invite a friend</PrimaryButton>
          <OutlineButton href="/pass">Back to my pass</OutlineButton>
        </div>
      </div>
    </AppShell>
  );
}
