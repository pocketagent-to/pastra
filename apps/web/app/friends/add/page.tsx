import { AppShell } from '@/components/layout/AppShell';
import { PromoCode } from '@/components/ui/PromoCode';

/** E3 · Add a friend by code (docs/product-spec.md section 12). */
export default function AddFriend() {
  return (
    <AppShell back="/friends" title="Add a friend">
      <div className="space-y-6 pt-2">
        <section className="space-y-2">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Your code</h2>
          <PromoCode code="K7M3QX" />
          <p className="text-xs text-ink-3">
            Share this code or your invite link. Anyone with it becomes your friend.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-head text-xs uppercase tracking-widest text-ink-3">Enter a code</h2>
          <div className="flex gap-2">
            <input
              placeholder="ABCDEF"
              maxLength={6}
              className="flex-1 rounded-button border border-divider bg-panel p-3 text-center font-mono text-lg uppercase tracking-widest"
            />
            <button className="rounded-button bg-white/10 px-5 font-semibold">Find</button>
          </div>
          <p className="text-xs text-ink-3">Up to 10 tries per hour.</p>
        </section>
      </div>
    </AppShell>
  );
}
