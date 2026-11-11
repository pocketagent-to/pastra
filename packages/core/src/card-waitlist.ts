import { eq } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { cardWaitlist } from '@pastra/db';

/**
 * Join the card beta-access waitlist (idempotent). The card is not live yet (Wirex pending), so
 * `/card` shows a coming-soon screen; this records that a signed-in user wants early access.
 * Returns true if this call added them, false if they were already on the list.
 */
export async function joinCardWaitlist(db: Database, userId: string): Promise<boolean> {
  const rows = await db
    .insert(cardWaitlist)
    .values({ userId })
    .onConflictDoNothing({ target: cardWaitlist.userId })
    .returning({ userId: cardWaitlist.userId });
  return rows.length > 0;
}

/** Whether a user is already on the card beta-access waitlist. */
export async function isOnCardWaitlist(db: Database, userId: string): Promise<boolean> {
  const rows = await db
    .select({ userId: cardWaitlist.userId })
    .from(cardWaitlist)
    .where(eq(cardWaitlist.userId, userId))
    .limit(1);
  return rows.length > 0;
}
