import { and, desc, eq, ne } from 'drizzle-orm';
import { catalog as defaultCatalog, type Axis, type Catalog } from '@pastra/catalog';
import type { TokenCipher } from '@pastra/crypto';
import type { Database } from '@pastra/db';
import { merchants, offerCodes, offers as offersTable, userOffers } from '@pastra/db';
import { formatCount } from '@pastra/scoring';
import { addWeeks, mondayOf } from './weeks';

/** A user's offer state as stored in `user_offers` (docs/product-spec.md section 8). */
export type OfferState = 'available' | 'locked' | 'activated' | 'used' | 'expired';
export type OfferType = 'cashback' | 'promo';

/** One offer card, shaped for the `OfferCard` props the Offers screen maps over. */
export interface OfferCardView {
  id: string;
  merchant: string;
  headline: string;
  axis: Axis;
  reason?: string;
  endsLabel?: string;
  type: OfferType;
  state: OfferState;
}

/** The detail payload for `/offers/{id}` (promo and cashback share this shape). */
export interface OfferDetailView {
  id: string;
  type: OfferType;
  axis: Axis;
  headline: string;
  reason?: string;
  partner: string;
  validUntil: string;
  terms: string;
  state: OfferState;
  /** Promo offers: the assigned pool code or shared code; `[PROMO-CODE]` when none is available. */
  code: string;
}

interface OfferViewDeps {
  db: Database;
  catalog: Catalog;
  cipher: TokenCipher;
}

const DAY_MS = 86_400_000;

/**
 * The reason jsonb written by `selectOffers` is `{ metric, value }`. Turn it into the simple-words
 * phrase the mockup shows ("14 hours played"), using the catalog metric label. Returns undefined
 * for a general offer (no metric) or an unknown metric, so the caller falls back cleanly.
 */
function metricPhrase(
  reason: Record<string, unknown> | null | undefined,
  catalog: Catalog,
): string | undefined {
  if (!reason) return undefined;
  const metric = reason.metric;
  const value = reason.value;
  if (typeof metric !== 'string' || typeof value !== 'number') return undefined;
  const spec = catalog.metricById.get(metric);
  if (!spec) return undefined;
  return `${formatCount(value)} ${spec.label.toLowerCase()}`;
}

/** Whole days from `now` until an offer ending in `endsWeek` expires (at the next drop). */
function daysUntilExpiry(endsWeek: string | null | undefined, now: Date): number | undefined {
  if (!endsWeek) return undefined;
  let expiry: Date;
  try {
    expiry = mondayOf(addWeeks(endsWeek, 1)); // the Monday after the ending week = the next drop
  } catch {
    return undefined;
  }
  const days = Math.ceil((expiry.getTime() - now.getTime()) / DAY_MS);
  return days > 0 ? days : undefined;
}

function plural(n: number, unit: string): string {
  return `${n} ${n === 1 ? unit : `${unit}s`}`;
}

/** Top-right card label, e.g. "expires in 2 days". Hidden once an offer has expired. */
function endsLabel(endsWeek: string | null | undefined, now: Date): string | undefined {
  const days = daysUntilExpiry(endsWeek, now);
  return days === undefined ? undefined : `expires in ${plural(days, 'day')}`;
}

/** Detail "Valid until" value, e.g. "Next drop · 2 days". */
function validUntilLabel(endsWeek: string | null | undefined, now: Date): string {
  const days = daysUntilExpiry(endsWeek, now);
  return days === undefined ? 'Next drop' : `Next drop · ${plural(days, 'day')}`;
}

/**
 * This week's offers for a user, as cards (docs/product-spec.md section 8). Joins `user_offers` to
 * the offer and merchant, humanises the stored reason, and derives the expiry label from the
 * offer's ending week. Expired offers drop out of the list. An empty result is a quiet week.
 */
export async function getOffersView(
  db: Database,
  userId: string,
  week: string,
  now: Date = new Date(),
): Promise<OfferCardView[]> {
  const rows = await db
    .select({ uo: userOffers, offer: offersTable, merchant: merchants })
    .from(userOffers)
    .innerJoin(offersTable, eq(offersTable.id, userOffers.offerId))
    .leftJoin(merchants, eq(merchants.id, offersTable.merchantId))
    .where(
      and(
        eq(userOffers.userId, userId),
        eq(userOffers.week, week),
        ne(userOffers.state, 'expired'),
      ),
    )
    .orderBy(desc(offersTable.priority), desc(userOffers.createdAt));

  return rows.map(({ uo, offer, merchant }) => {
    const phrase = metricPhrase(uo.reason, defaultCatalog);
    return {
      id: offer.id,
      merchant: merchant?.name || '[PARTNER]',
      headline: offer.headline,
      axis: offer.axis as Axis,
      reason: phrase ? `For ${phrase}` : undefined,
      endsLabel: endsLabel(offer.endsWeek, now),
      type: offer.type,
      state: uo.state,
    };
  });
}

/** Resolve a promo offer's code: a pool code assigned to this user (decrypted), else the shared
 * code. Returns undefined when no code is available, so the `[PROMO-CODE]` placeholder stays. */
async function resolvePromoCode(
  db: Database,
  cipher: TokenCipher,
  offer: typeof offersTable.$inferSelect,
  userId: string,
): Promise<string | undefined> {
  if (offer.codeMode === 'pool') {
    const [assigned] = await db
      .select()
      .from(offerCodes)
      .where(and(eq(offerCodes.offerId, offer.id), eq(offerCodes.assignedUserId, userId)));
    if (!assigned) return undefined;
    try {
      return cipher.decrypt(assigned.codeEnc);
    } catch {
      return undefined; // never surface a decryption failure as a code
    }
  }
  return offer.sharedCode || undefined;
}

/**
 * The detail payload for one of a user's offers (docs/product-spec.md section 12, OfferDetail /
 * OfferCashback). Returns null when the user does not hold this offer this week or it is gone, so
 * the page can render 404. Bracket placeholders stay when the real value is absent.
 */
export async function getOfferView(
  deps: OfferViewDeps,
  userId: string,
  offerId: string,
  week: string,
  now: Date = new Date(),
): Promise<OfferDetailView | null> {
  const { db, catalog, cipher } = deps;

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
  if (!uo) return null;

  const [offer] = await db.select().from(offersTable).where(eq(offersTable.id, offerId));
  if (!offer) return null;

  const [merchant] = await db.select().from(merchants).where(eq(merchants.id, offer.merchantId));

  const phrase = metricPhrase(uo.reason, catalog);
  const code =
    offer.type === 'promo'
      ? ((await resolvePromoCode(db, cipher, offer, userId)) ?? '[PROMO-CODE]')
      : '[PROMO-CODE]';

  return {
    id: offer.id,
    type: offer.type,
    axis: offer.axis as Axis,
    headline: offer.headline,
    reason: phrase ? `Unlocked by ${phrase}.` : undefined,
    partner: merchant?.name || '[PARTNER]',
    validUntil: validUntilLabel(offer.endsWeek, now),
    terms: offer.terms || '[OFFER TERMS]',
    state: uo.state,
    code,
  };
}
