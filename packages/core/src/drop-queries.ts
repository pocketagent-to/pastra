import { asc, gt } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { connections, users } from '@pastra/db';

/**
 * Keyset-pagination reads for the weekly drop (docs/architecture.md section 9). The worker pages
 * through connections and users by id (`id > cursor ORDER BY id LIMIT n`) so the whole table never
 * lives in worker memory. Pass an empty string for the first page; use the last row's id as the next
 * cursor. These live in core so the worker needs no direct drizzle dependency.
 */

export interface ConnectionSyncRow {
  id: string;
  provider: string;
  lastSyncedWeek: string | null;
}

/** One page of connections to consider for sync, ordered by id. */
export function pageConnectionsForSync(
  db: Database,
  cursor: string,
  limit: number,
): Promise<ConnectionSyncRow[]> {
  return db
    .select({
      id: connections.id,
      provider: connections.provider,
      lastSyncedWeek: connections.lastSyncedWeek,
    })
    .from(connections)
    .where(cursor ? gt(connections.id, cursor) : undefined)
    .orderBy(asc(connections.id))
    .limit(limit);
}

export interface UserDropRow {
  id: string;
  country: string | null;
  offersConsent: boolean;
}

/** One page of users (with the fields the compute/offers steps need), ordered by id. */
export function pageUsersForDrop(db: Database, cursor: string, limit: number): Promise<UserDropRow[]> {
  return db
    .select({ id: users.id, country: users.country, offersConsent: users.offersConsent })
    .from(users)
    .where(cursor ? gt(users.id, cursor) : undefined)
    .orderBy(asc(users.id))
    .limit(limit);
}

/** One page of user ids, ordered by id (for the recap step). */
export function pageUserIds(db: Database, cursor: string, limit: number): Promise<{ id: string }[]> {
  return db
    .select({ id: users.id })
    .from(users)
    .where(cursor ? gt(users.id, cursor) : undefined)
    .orderBy(asc(users.id))
    .limit(limit);
}
