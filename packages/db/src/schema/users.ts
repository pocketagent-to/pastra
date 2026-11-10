import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { createdAt, pk, ref } from './ids';

/** Users (docs/architecture.md section 5, with the 10 November additions). */
export const users = pgTable(
  'users',
  {
    id: pk(),
    handle: text('handle'), // null until the "pick your name" step
    displayName: text('display_name'),
    bio: text('bio'), // up to 80 chars, enforced in core
    avatarKey: text('avatar_key'),
    friendCode: text('friend_code'),
    country: text('country'),
    status: text('status').$type<'active' | 'deleting'>().notNull().default('active'),
    invitedBy: ref('invited_by'),
    offersConsent: boolean('offers_consent').notNull().default(false),
    cardSpendConsent: boolean('card_spend_consent').notNull().default(false),
    notifyTelegram: boolean('notify_telegram').notNull().default(false),
    notifyEmail: boolean('notify_email').notNull().default(false),
    showLevel: boolean('show_level').notNull().default(true),
    showStamps: boolean('show_stamps').notNull().default(true),
    showNumbers: boolean('show_numbers').notNull().default(true),
    showBio: boolean('show_bio').notNull().default(true),
    peakPoints: integer('peak_points').notNull().default(0),
    handleChangedAt: timestamp('handle_changed_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    uniqueIndex('users_handle_lower_idx').on(sql`lower(${t.handle})`),
    uniqueIndex('users_friend_code_idx').on(t.friendCode),
  ],
);

/** Sign-in identities: Google and email only (docs/architecture.md section 6, 10 Nov change). */
export const identities = pgTable(
  'identities',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    kind: text('kind').$type<'google' | 'email'>().notNull(),
    subject: text('subject').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('identities_kind_subject_idx').on(t.kind, t.subject)],
);

/** Sessions: the cookie holds a random token; the DB stores its SHA-256 hash. */
export const sessions = pgTable(
  'sessions',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    userAgent: text('user_agent'),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('sessions_token_hash_idx').on(t.tokenHash)],
);

/** One-time challenges (email links, OAuth state, wallet nonces), 15-minute lifetime. */
export const loginChallenges = pgTable('login_challenges', {
  id: pk(),
  kind: text('kind').$type<'email_link' | 'oauth_state' | 'wallet_nonce'>().notNull(),
  valueHash: text('value_hash').notNull(),
  payload: jsonb('payload').$type<Record<string, unknown>>(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: createdAt(),
});

/** Append-only consent journal (docs/product-spec.md section 14). */
export const consents = pgTable('consents', {
  id: pk(),
  userId: ref('user_id').notNull(),
  kind: text('kind').notNull(),
  subject: text('subject'),
  action: text('action').$type<'granted' | 'withdrawn'>().notNull(),
  textVersion: text('text_version'),
  createdAt: createdAt(),
});
