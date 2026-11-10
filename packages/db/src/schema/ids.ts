import { randomBytes } from 'node:crypto';
import { timestamp, uuid } from 'drizzle-orm/pg-core';

/**
 * UUID v7: a time-ordered UUID (48-bit millisecond timestamp + random), so ids sort by creation
 * time. All identifiers in the data model are UUID v7 (docs/architecture.md section 5).
 */
export function uuidv7(): string {
  const ts = Date.now();
  const bytes = new Uint8Array(16);
  bytes[0] = Math.floor(ts / 2 ** 40) & 0xff;
  bytes[1] = Math.floor(ts / 2 ** 32) & 0xff;
  bytes[2] = Math.floor(ts / 2 ** 24) & 0xff;
  bytes[3] = Math.floor(ts / 2 ** 16) & 0xff;
  bytes[4] = Math.floor(ts / 2 ** 8) & 0xff;
  bytes[5] = ts & 0xff;
  bytes.set(randomBytes(10), 6);
  bytes[6] = (bytes[6]! & 0x0f) | 0x70; // version 7
  bytes[8] = (bytes[8]! & 0x3f) | 0x80; // variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

/** A UUID v7 primary key column with an app-side default. */
export const pk = () =>
  uuid('id')
    .primaryKey()
    .$defaultFn(() => uuidv7());

/** A UUID v7 column (non-primary) with an app-side default. */
export const id = (name: string) => uuid(name).$defaultFn(() => uuidv7());

/** A foreign-key-shaped UUID column (no DB constraint; integrity enforced in core). */
export const ref = (name: string) => uuid(name);

/** `created_at timestamptz not null default now()`. */
export const createdAt = () =>
  timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
