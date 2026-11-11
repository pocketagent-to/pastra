import { asc, desc, eq } from 'drizzle-orm';
import { AXES, catalog, type Axis, type Condition } from '@pastra/catalog';
import type { Config } from '@pastra/config';
import type { Database } from '@pastra/db';
import { merchants, offers as offersTable } from '@pastra/db';
import { CoreError } from './errors';
import { validateOfferRule } from './offers';

/**
 * Admin offers CRUD (docs/product-spec.md section 10). The admin screens create and edit the
 * `offers` rows that `selectOffers` later matches against each user's pass. Rules are validated
 * with {@link validateOfferRule} so a health-axis metric can never gate an offer. Money (the
 * cashback rate) is stored as a string, never a float.
 */

export type OfferType = 'cashback' | 'promo';
export type OfferCodeMode = 'shared' | 'pool';

/** A side the offer targets: one of the six axes, or `any` for an offer with no side. */
export type OfferSide = Axis | 'any';

const OFFER_TYPES = new Set<string>(['cashback', 'promo']);
const CODE_MODES = new Set<string>(['shared', 'pool']);
const SIDES = new Set<string>([...AXES, 'any']);

/** What the admin form submits for one offer (create or update). */
export interface OfferInput {
  merchantName: string;
  type: OfferType;
  /** One of the six axes, or `any`. */
  axis: string;
  headline: string;
  terms?: string | null;
  rule?: { all: Condition[] };
  priority?: number;
  /** ISO country codes the offer is limited to; empty/absent means all supported countries. */
  countries?: string[] | null;
  startsWeek?: string | null;
  endsWeek?: string | null;
  /** Only meaningful for promo offers. */
  codeMode?: OfferCodeMode | null;
  /** The single code for a `shared` promo offer. */
  sharedCode?: string | null;
  /** Cashback rate as a string (never a float), e.g. "5" or the literal placeholder "[RATE]". */
  rate?: string | null;
  active?: boolean;
}

/** An offer row joined with its merchant name, as the admin list and edit screens read it. */
export interface AdminOffer {
  id: string;
  merchantId: string;
  merchantName: string;
  type: OfferType;
  axis: string;
  headline: string;
  terms: string | null;
  rule: { all: Condition[] };
  priority: number;
  countries: string[] | null;
  startsWeek: string | null;
  endsWeek: string | null;
  codeMode: OfferCodeMode | null;
  sharedCode: string | null;
  rate: string | null;
  active: boolean;
}

type OfferRow = typeof offersTable.$inferSelect;

function mapOffer(offer: OfferRow, merchantName: string | null): AdminOffer {
  return {
    id: offer.id,
    merchantId: offer.merchantId,
    merchantName: merchantName ?? '',
    type: offer.type,
    axis: offer.axis,
    headline: offer.headline,
    terms: offer.terms,
    rule: (offer.rule as { all: Condition[] } | null) ?? { all: [] },
    priority: offer.priority,
    countries: offer.countries ?? null,
    startsWeek: offer.startsWeek,
    endsWeek: offer.endsWeek,
    codeMode: offer.codeMode ?? null,
    sharedCode: offer.sharedCode,
    rate: offer.rate,
    active: offer.active,
  };
}

function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Is this user allowed into the admin area? True when `ADMIN_USERS` (config) contains the user's
 * handle or email, compared case-insensitively. An empty allowlist admits no one.
 */
export function isAdmin(
  config: Pick<Config, 'ADMIN_USERS'>,
  user: { handle?: string | null; email?: string | null } | null | undefined,
): boolean {
  if (!user) return false;
  const allow = new Set(
    config.ADMIN_USERS.map((entry) => entry.trim().toLowerCase()).filter(
      (entry) => entry.length > 0,
    ),
  );
  if (allow.size === 0) return false;
  const candidates = [user.handle, user.email]
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim().toLowerCase());
  return candidates.some((candidate) => allow.has(candidate));
}

/** Find a merchant by exact name, creating it when absent; returns the merchant id. */
export async function ensureMerchant(db: Database, name: string): Promise<string> {
  const trimmed = name.trim();
  if (trimmed.length === 0) throw new CoreError('invalid', 'merchant name is required');
  const [existing] = await db.select().from(merchants).where(eq(merchants.name, trimmed));
  if (existing) return existing.id;
  const [created] = await db
    .insert(merchants)
    .values({ name: trimmed })
    .returning({ id: merchants.id });
  if (!created) throw new CoreError('invalid', 'could not create merchant');
  return created.id;
}

/** Every merchant (id and name), for the admin merchant picker. */
export async function listMerchants(db: Database): Promise<Array<{ id: string; name: string }>> {
  return db
    .select({ id: merchants.id, name: merchants.name })
    .from(merchants)
    .orderBy(asc(merchants.name));
}

/** All offers with their merchant name, highest priority first (admin list). */
export async function listOffers(db: Database): Promise<AdminOffer[]> {
  const rows = await db
    .select({ offer: offersTable, merchantName: merchants.name })
    .from(offersTable)
    .leftJoin(merchants, eq(offersTable.merchantId, merchants.id))
    .orderBy(desc(offersTable.priority), desc(offersTable.createdAt));
  return rows.map((row) => mapOffer(row.offer, row.merchantName));
}

/** One offer with its merchant name, or null if it does not exist. */
export async function getOffer(db: Database, offerId: string): Promise<AdminOffer | null> {
  const [row] = await db
    .select({ offer: offersTable, merchantName: merchants.name })
    .from(offersTable)
    .leftJoin(merchants, eq(offersTable.merchantId, merchants.id))
    .where(eq(offersTable.id, offerId));
  return row ? mapOffer(row.offer, row.merchantName) : null;
}

/** Validate the enum-shaped fields and the rule, then build the column values for insert/update. */
function buildValues(input: OfferInput): Omit<typeof offersTable.$inferInsert, 'merchantId'> {
  if (!OFFER_TYPES.has(input.type)) throw new CoreError('invalid', 'offer type');
  if (!SIDES.has(input.axis)) throw new CoreError('invalid', 'offer side');
  const headline = normalizeText(input.headline);
  if (!headline) throw new CoreError('invalid', 'headline is required');
  if (input.codeMode != null && !CODE_MODES.has(input.codeMode)) {
    throw new CoreError('invalid', 'code mode');
  }

  const rule = input.rule ?? { all: [] };
  validateOfferRule(catalog, rule);

  const isPromo = input.type === 'promo';
  const codeMode = isPromo ? (input.codeMode ?? null) : null;
  const priority = Number.isFinite(input.priority) ? Math.trunc(input.priority as number) : 0;
  const countries = input.countries && input.countries.length > 0 ? input.countries : null;

  return {
    type: input.type,
    axis: input.axis,
    headline,
    terms: normalizeText(input.terms),
    rule,
    priority,
    countries,
    startsWeek: normalizeText(input.startsWeek),
    endsWeek: normalizeText(input.endsWeek),
    codeMode,
    // The shared code only belongs to a shared promo; keep the string verbatim (may be a placeholder).
    sharedCode: isPromo && codeMode === 'shared' ? normalizeText(input.sharedCode) : null,
    rate: normalizeText(input.rate),
    active: input.active ?? true,
  };
}

/** Create a new offer; returns its id. */
export async function createOffer(db: Database, input: OfferInput): Promise<string> {
  const values = buildValues(input);
  const merchantId = await ensureMerchant(db, input.merchantName);
  const [created] = await db
    .insert(offersTable)
    .values({ ...values, merchantId })
    .returning({ id: offersTable.id });
  if (!created) throw new CoreError('invalid', 'could not create offer');
  return created.id;
}

/** Update an existing offer in place. Throws `not_found` when the offer does not exist. */
export async function updateOffer(db: Database, offerId: string, input: OfferInput): Promise<void> {
  const [existing] = await db
    .select({ id: offersTable.id })
    .from(offersTable)
    .where(eq(offersTable.id, offerId));
  if (!existing) throw new CoreError('not_found', 'offer');
  const values = buildValues(input);
  const merchantId = await ensureMerchant(db, input.merchantName);
  await db
    .update(offersTable)
    .set({ ...values, merchantId })
    .where(eq(offersTable.id, offerId));
}
