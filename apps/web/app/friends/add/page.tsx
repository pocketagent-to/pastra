import { ensureFriendCode } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { PromoCode } from '@/components/ui/PromoCode';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';
import { AddFriendForm } from './AddFriendForm';

/** E3 · Add a friend by code (docs/product-spec.md section 12). */
export default async function AddFriend() {
  const user = await requireUser();
  const code = await ensureFriendCode(getDb(), user.id);
  return (
    <AppShell back="/friends" title="Add a friend">
      <div className="flex min-h-full flex-col gap-[22px] pt-2">
        <section className="flex flex-col gap-3 rounded-panel border border-[#3A2C8F] p-[18px]">
          <h2 className="font-head text-[13px] font-bold tracking-[0.05em]">Your code</h2>
          <PromoCode code={code} variant="tiles" />
          <p className="text-[13px] leading-[1.45] text-ink-2">
            Anyone with this code can add you.
          </p>
        </section>

        <AddFriendForm />

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
