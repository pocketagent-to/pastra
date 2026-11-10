import { jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, pk, ref } from './ids';

/** Outgoing notifications; `dedupe_key` prevents double sends. */
export const notifications = pgTable(
  'notifications',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    kind: text('kind').notNull(),
    channel: text('channel').$type<'telegram' | 'email'>().notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    status: text('status').$type<'queued' | 'sent' | 'failed'>().notNull().default('queued'),
    sentAt: timestamp('sent_at', { withTimezone: true }),
    dedupeKey: text('dedupe_key').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('notifications_dedupe_idx').on(t.dedupeKey)],
);

/** Data export requests (docs/product-spec.md section 14). */
export const dataExports = pgTable('data_exports', {
  id: pk(),
  userId: ref('user_id').notNull(),
  status: text('status').$type<'pending' | 'ready' | 'expired'>().notNull().default('pending'),
  fileKey: text('file_key'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  createdAt: createdAt(),
});

/** Admin actions and sensitive operations. */
export const auditLog = pgTable('audit_log', {
  id: pk(),
  actor: text('actor'),
  action: text('action').notNull(),
  subject: text('subject'),
  meta: jsonb('meta').$type<Record<string, unknown>>(),
  createdAt: createdAt(),
});
