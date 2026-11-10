import { AppShell } from '@/components/layout/AppShell';
import { PromoCode } from '@/components/ui/PromoCode';

/** E3 · Add a friend by code (docs/product-spec.md section 12). */
export default function AddFriend() {
  return (
    <AppShell back="/friends" title="Add a friend">
      <div className="flex min-h-full flex-col gap-[22px] pt-2">
        <section className="flex flex-col gap-3 rounded-panel border border-[#3A2C8F] p-[18px]">
          <h2 className="font-head text-[13px] font-bold tracking-[0.05em]">Your code</h2>
          <PromoCode code="K7M3QX" />
          <p className="text-[13px] leading-[1.45] text-ink-2">
            Anyone with this code can add you.
          </p>
        </section>

        <section className="flex flex-col gap-2.5">
          <label
            htmlFor="friend-code"
            className="font-head text-[13px] font-bold tracking-[0.05em]"
          >
            Enter a friend&apos;s code
          </label>
          <div className="flex gap-2">
            <input
              id="friend-code"
              placeholder="ABCDEF"
              maxLength={6}
              autoCapitalize="characters"
              autoComplete="off"
              className="h-[54px] min-w-0 flex-1 rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 font-head text-xl font-bold uppercase tracking-[0.3em]"
            />
            <button
              type="button"
              className="h-[54px] rounded-button border-[1.5px] border-white px-5 font-semibold"
            >
              Find
            </button>
          </div>
          <p className="text-[13px] leading-[1.5] text-ink-3">6 characters, letters and numbers.</p>
        </section>

        <p className="text-[13px] leading-[1.5] text-ink-3">
          Adding is instant for both of you. You both see the sides each of you shares with friends.
          Either of you can remove the other at any time.
        </p>

        <div className="mt-auto flex flex-col gap-1 rounded-tile border-[1.5px] border-[#FF8A7A] p-4">
          <div className="text-sm font-semibold text-[#FF8A7A]">When the code is wrong</div>
          <div className="text-[13px] leading-[1.45] text-ink-2">
            No one has this code. Check it with your friend, or ask them for a new one.
          </div>
        </div>
      </div>
    </AppShell>
  );
}
