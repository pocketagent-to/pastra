import { and, eq, isNull } from 'drizzle-orm';
import type { TokenCipher } from '@pastra/crypto';
import type { Database } from '@pastra/db';
import { cardAccounts, offerCodes, offers as offersTable, userOffers } from '@pastra/db';
import { CoreError } from './errors';
import { activateOffer } from './offers';
import type { OfferState } from './offers-view';

/** The outcome of activating a cashback offer or revealing a promo code. */
export interface OfferActionResult {
  /** The user-offer state after the action (always `activated` on success). */
  state: OfferState;
  /** For a promo offer: the revealed code (assigned pool code or shared code), when one exists. */
  code?: string;
}

/** Whether the user holds a usable card (mirrors buildScoringInput; never touches `packages/card`). */
async function userHasCard(db: Database, userId: string): Promise<boolean> {
  const [card] = await db.select().from(cardAccounts).where(eq(cardAccounts.userId, userId));
  return card?.cardStatus === 'active' || card?.cardStatus === 'frozen';
}

/**
 * Assign a personal code from the offer's pool to the user on first reveal (offer_codes). Returns
 * the user's already-assigned code if there is one (idempotent), a freshly assigned code otherwise,
 * or undefined when the pool is exhausted — the caller keeps the `[PROMO-CODE]` placeholder then.
 * The guarded UPDATE (assigned_user_id IS NULL) keeps two concurrent reveals from sharing a code.
 */
async function assignPoolCode(
  db: Database,
  cipher: TokenCipher,
  offerId: string,
  userId: string,
  week: string,
): Promise<string | undefined> {
  const [mine] = await db
    .select()
    .from(offerCodes)
    .where(and(eq(offerCodes.offerId, offerId), eq(offerCodes.assignedUserId, userId)));
  if (mine) {
    try {
      return cipher.decrypt(mine.codeEnc);
    } catch {
      return undefined; // never surface a decryption failure as a code
    }
  }

  for (let attempt = 0; attempt < 3; attempt++) {
    const [free] = await db
      .select()
      .from(offerCodes)
      .where(and(eq(offerCodes.offerId, offerId), isNull(offerCodes.assignedUserId)))
      .limit(1);
    if (!free) return undefined; // pool exhausted

    const claimed = await db
      .update(offerCodes)
      .set({ assignedUserId: userId, assignedWeek: week })
      .where(and(eq(offerCodes.id, free.id), isNull(offerCodes.assignedUserId)))
      .returning({ codeEnc: offerCodes.codeEnc });
    if (claimed.length > 0) {
      try {
        return cipher.decrypt(claimed[0]!.codeEnc);
      } catch {
        return undefined;
      }
    }
    // lost the race for this row — try another one
  }
  return undefined;
}

/**
 * Activate one of a user's offers this week (docs/product-spec.md section 12). A cashback offer is
 * activated through {@link activateOffer} (which requires a card); a promo offer reveals its code
 * — a pool code assigned on first reveal, or the shared code — with no card required. Both move the
 * user-offer to `activated`. Throws `offer_unavailable` when the user does not hold the offer, and
 * `card_required` when a cashback offer is activated without a card.
 */
export async function activateUserOffer(
  deps: { db: Database; cipher: TokenCipher },
  params: { userId: string; offerId: string; week: string },
): Promise<OfferActionResult> {
  const { db, cipher } = deps;
  const { userId, offerId, week } = params;

  const [uo] = await db
    .select()
    .from(userOffers)
    .where(
      and(
        eq(userOffers.userId, userId),
        eq(userOffers.offerId, offerId),
        eq(userOffers.week, week),
      ),
    );
  if (!uo) throw new CoreError('offer_unavailable');

  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId));
  if (!offer) throw new CoreError('offer_unavailable');

  if (offer.type === 'cashback') {
    const hasCard = await userHasCard(db, userId);
    await activateOffer(db, { userId, offerId, week, hasCard });
    return { state: 'activated' };
  }

  // promo: reveal a code (no card required).
  const code =
    offer.codeMode === 'pool'
      ? await assignPoolCode(db, cipher, offerId, userId, week)
      : (offer.sharedCode ?? undefined);

  if (uo.state === 'available' || uo.state === 'locked') {
    await db
      .update(userOffers)
      .set({ state: 'activated', activatedAt: new Date() })
      .where(eq(userOffers.id, uo.id));
  }
  return { state: 'activated', code };
}
