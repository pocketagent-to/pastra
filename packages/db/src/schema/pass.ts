import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, pk, ref } from './ids';

/** ISO weeks. Exactly one row is `live` at a time (docs/architecture.md section 5). */
export const weeks = pgTable('weeks', {
  week: text('week').primaryKey(), // e.g. 2026-W46
  dropAt: timestamp('drop_at', { withTimezone: true }).notNull(),
  status: text('status').$type<'preparing' | 'live' | 'closed'>().notNull().default('preparing'),
  createdAt: createdAt(),
});

/** Computed pass per user per week. The current pass is the `live` row of the current week. */
export const passSnapshots = pgTable(
  'pass_snapshots',
  {
    userId: ref('user_id').notNull(),
    week: text('week').notNull(),
    state: text('state').$type<'draft' | 'live'>().notNull(),
    axes: jsonb('axes').$type<Record<string, unknown>>().notNull(),
    points: integer('points').notNull(),
    level: integer('level').notNull(),
    title: text('title').notNull(),
    topPct: jsonb('top_pct').$type<Record<string, number | null>>(),
    keyNumbers: jsonb('key_numbers').$type<unknown[]>(),
    computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.week, t.state] }),
    index('pass_snapshots_week_state_idx').on(t.week, t.state),
  ],
);

/** Stamps. Service stamps are revoked on disconnect; achievement stamps are permanent. */
export const stamps = pgTable(
  'stamps',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    stampKey: text('stamp_key').notNull(),
    tier: integer('tier'),
    awardedWeek: text('awarded_week'),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    sourceConnectionId: ref('source_connection_id'),
    createdAt: createdAt(),
  },
  // Every pass recompute filters stamps by user (scoring-input, stamps view, recap, export).
  (t) => [
    index('stamps_user_idx').on(t.userId),
    index('stamps_user_week_idx').on(t.userId, t.awardedWeek),
  ],
);

/** Weekly recap, assembled at the drop from two adjacent snapshots. */
export const recaps = pgTable(
  'recaps',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    week: text('week').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>().notNull(),
    seenAt: timestamp('seen_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  // One recap per user per week: makes the publish recap insert idempotent and serves the read
  // (userId, week <= X order by week desc).
  (t) => [uniqueIndex('recaps_user_week_idx').on(t.userId, t.week)],
);

/** Per-axis visibility: everyone / friends / me. Sports defaults to `me` (10 Nov change). */
export const visibility = pgTable(
  'visibility',
  {
    userId: ref('user_id').notNull(),
    axis: text('axis').notNull(),
    level: text('level').$type<'everyone' | 'friends' | 'me'>().notNull().default('everyone'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.axis] })],
);

/** Friendships, stored once per pair with `user_a < user_b`. Reward only for `invite`. */
export const friendships = pgTable(
  'friendships',
  {
    userA: ref('user_a').notNull(),
    userB: ref('user_b').notNull(),
    source: text('source').$type<'invite' | 'code'>().notNull(),
    rewarded: boolean('rewarded').notNull().default(false),
    createdAt: createdAt(),
  },
  // PK (user_a, user_b) serves the user_a side; the OR-query also filters by user_b.
  (t) => [primaryKey({ columns: [t.userA, t.userB] }), index('friendships_user_b_idx').on(t.userB)],
);

/** Invites: the source of friend rewards and the "hasn't joined yet" rows. */
export const invites = pgTable(
  'invites',
  {
    id: pk(),
    inviterId: ref('inviter_id').notNull(),
    inviteeId: ref('invitee_id'),
    joinedAt: timestamp('joined_at', { withTimezone: true }),
    firstConnectAt: timestamp('first_connect_at', { withTimezone: true }),
    lastRemindedAt: timestamp('last_reminded_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  // Friends screen + invite creation look up by inviter.
  (t) => [index('invites_inviter_idx').on(t.inviterId)],
);
