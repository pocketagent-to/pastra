import {
  doublePrecision,
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

/** A connection between a Pastra account and a service account (docs/architecture.md section 5). */
export const connections = pgTable(
  'connections',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    provider: text('provider').notNull(),
    externalId: text('external_id').notNull(),
    status: text('status')
      .$type<'connected' | 'needs_reconnect' | 'error'>()
      .notNull()
      .default('connected'),
    accessTokenEnc: text('access_token_enc'),
    refreshTokenEnc: text('refresh_token_enc'),
    tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
    scopes: text('scopes').array(),
    lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
    lastSyncedWeek: text('last_synced_week'),
    staleWeeks: integer('stale_weeks').notNull().default(0),
    errorCode: text('error_code'),
    createdAt: createdAt(),
  },
  (t) => [
    // One service account lives on a single pass (docs/product-spec.md "один аккаунт — один pass").
    uniqueIndex('connections_provider_external_idx').on(t.provider, t.externalId),
    index('connections_user_idx').on(t.userId),
  ],
);

/** Weekly metric snapshots. Cascade-deleted with the connection (immediate data removal). */
export const metricValues = pgTable(
  'metric_values',
  {
    connectionId: ref('connection_id')
      .notNull()
      .references(() => connections.id, { onDelete: 'cascade' }),
    metricKey: text('metric_key').notNull(),
    value: doublePrecision('value').notNull(),
    week: text('week').notNull(),
    fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.connectionId, t.metricKey, t.week] })],
);

/** Non-numeric extras for display (top game, first-tx year, hashed Discord server ids). */
export const metricExtras = pgTable(
  'metric_extras',
  {
    connectionId: ref('connection_id')
      .notNull()
      .references(() => connections.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    value: jsonb('value').$type<unknown>(),
    week: text('week').notNull(),
  },
  (t) => [primaryKey({ columns: [t.connectionId, t.key, t.week] })],
);

/** Sync log for monitoring. Cascade-deleted with the connection. */
export const syncRuns = pgTable('sync_runs', {
  id: pk(),
  connectionId: ref('connection_id')
    .notNull()
    .references(() => connections.id, { onDelete: 'cascade' }),
  week: text('week').notNull(),
  status: text('status').$type<'ok' | 'failed' | 'skipped'>().notNull(),
  attempt: integer('attempt').notNull().default(1),
  errorCode: text('error_code'),
  durationMs: integer('duration_ms'),
  createdAt: createdAt(),
});
