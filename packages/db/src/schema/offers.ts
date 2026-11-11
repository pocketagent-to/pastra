import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, pk, ref } from './ids';

export const merchants = pgTable('merchants', {
  id: pk(),
  name: text('name').notNull(),
  logoUrl: text('logo_url'),
  siteUrl: text('site_url'),
  source: text('source').$type<'direct' | 'wirex'>().notNull().default('direct'),
  createdAt: createdAt(),
});

/** Offers. `rule` is a list of conditions (docs/product-spec.md section 10). Money as strings. */
export const offers = pgTable('offers', {
  id: pk(),
  merchantId: ref('merchant_id').notNull(),
  type: text('type').$type<'cashback' | 'promo'>().notNull(),
  axis: text('axis').notNull(),
  headline: text('headline').notNull(),
  terms: text('terms'),
  rule: jsonb('rule').$type<{ all: unknown[] }>().notNull().default({ all: [] }),
  priority: integer('priority').notNull().default(0),
  countries: text('countries').array(),
  startsWeek: text('starts_week'),
  endsWeek: text('ends_week'),
  codeMode: text('code_mode').$type<'shared' | 'pool'>(),
  sharedCode: text('shared_code'),
  rate: text('rate'),
  active: boolean('active').notNull().default(true),
  createdAt: createdAt(),
});

/** Pool of personal promo codes, encrypted; assigned on first reveal. */
export const offerCodes = pgTable(
  'offer_codes',
  {
    id: pk(),
    offerId: ref('offer_id').notNull(),
    codeEnc: text('code_enc').notNull(),
    assignedUserId: ref('assigned_user_id'),
    assignedWeek: text('assigned_week'),
    createdAt: createdAt(),
  },
  // Promo reveal looks up by offer + assignee, and probes free codes (assigned_user_id IS NULL).
  (t) => [index('offer_codes_offer_assigned_idx').on(t.offerId, t.assignedUserId)],
);

/** A user's offers for a week with their state and the "because you…" reason. */
export const userOffers = pgTable(
  'user_offers',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    offerId: ref('offer_id').notNull(),
    week: text('week').notNull(),
    state: text('state')
      .$type<'available' | 'locked' | 'activated' | 'used' | 'expired'>()
      .notNull()
      .default('available'),
    reason: jsonb('reason').$type<Record<string, unknown>>(),
    activatedAt: timestamp('activated_at', { withTimezone: true }),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('user_offers_user_offer_week_idx').on(t.userId, t.offerId, t.week),
    index('user_offers_user_week_idx').on(t.userId, t.week),
  ],
);
