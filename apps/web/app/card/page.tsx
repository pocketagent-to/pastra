import { isOnCardWaitlist } from '@pastra/core';
import { AppShell } from '@/components/layout/AppShell';
import { CardComingSoon } from '@/components/card/CardComingSoon';
import { requireUser, getPassView } from '@/lib/data';
import { getDb } from '@/lib/server';

export const dynamic = 'force-dynamic';

/**
 * F5 · Card — coming-soon / beta waitlist. The card is not live yet (Wirex pending), so `/card`
 * shows a pre-launch screen built on the user's own pass (handle, level, rarity) with a single CTA
 * to apply for beta access. The active-card dashboard returns once the card provider is live.
 */
export default async function CardScreen() {
  const user = await requireUser();
  const [pass, applied] = await Promise.all([
    getPassView(user),
    isOnCardWaitlist(getDb(), user.id),
  ]);

  return (
    <AppShell tab>
      <CardComingSoon
        handle={pass.handle}
        level={pass.level}
        rarity={pass.rarity}
        initialApplied={applied}
      />
    </AppShell>
  );
}
