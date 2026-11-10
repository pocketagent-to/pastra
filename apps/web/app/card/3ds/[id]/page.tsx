import { AppShell } from '@/components/layout/AppShell';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** F12 · Card — approve an online payment (3-D Secure, 5-minute window). */
export default async function Card3ds({ params }: { params: Promise<{ id: string }> }) {
  await params;
  return (
    <AppShell back="/card" title="Approve payment">
      <div className="space-y-6 pt-2 text-center">
        <div className="rounded-panel border border-divider bg-panel p-6">
          <div className="text-sm text-ink-3">Payment at</div>
          <div className="font-head text-xl font-bold">[MERCHANT]</div>
          <div className="mt-2 font-head text-3xl font-extrabold">[AMOUNT]</div>
          <div className="mt-2 text-xs text-orange-light">Expires in 4:45</div>
        </div>
        <p className="text-sm text-ink-2">Did you make this payment?</p>
        <div className="space-y-3">
          <PrimaryButton href="/card">Approve</PrimaryButton>
          <OutlineButton href="/card">Decline</OutlineButton>
        </div>
      </div>
    </AppShell>
  );
}
