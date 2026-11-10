import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import {
  connections,
  passSnapshots,
  stamps,
  userOffers,
  users,
  visibility,
  weeks,
} from '@pastra/db';
import { isoWeekString } from './weeks';

/** The current week string (UTC). */
export function currentWeek(now: Date = new Date()): string {
  return isoWeekString(now);
}

/** The live week row, if any. */
export async function getLiveWeek(db: Database) {
  const [row] = await db.select().from(weeks).where(eq(weeks.status, 'live'));
  return row ?? null;
}

/** A user's live pass snapshot for a week. */
export async function getLivePass(db: Database, userId: string, week: string) {
  const [row] = await db
    .select()
    .from(passSnapshots)
    .where(
      and(
        eq(passSnapshots.userId, userId),
        eq(passSnapshots.week, week),
        eq(passSnapshots.state, 'live'),
      ),
    );
  return row ?? null;
}

/** A user's offers for a week that are still visible (not expired). */
export async function getUserOffers(db: Database, userId: string, week: string) {
  return db
    .select()
    .from(userOffers)
    .where(and(eq(userOffers.userId, userId), eq(userOffers.week, week)));
}

/** A user by id. */
export async function getUser(db: Database, userId: string) {
  const [row] = await db.select().from(users).where(eq(users.id, userId));
  return row ?? null;
}

/** A user by handle (case-insensitive is enforced by the unique index; exact match here). */
export async function getUserByHandle(db: Database, handle: string) {
  const [row] = await db.select().from(users).where(eq(users.handle, handle.toLowerCase()));
  return row ?? null;
}

/** Per-axis visibility map for a user (defaults applied by the caller). */
export async function getVisibility(db: Database, userId: string) {
  return db.select().from(visibility).where(eq(visibility.userId, userId));
}

/** A user's current (non-revoked) stamps. */
export async function getUserStamps(db: Database, userId: string) {
  return db
    .select()
    .from(stamps)
    .where(and(eq(stamps.userId, userId), isNull(stamps.revokedAt)));
}

/** A user's connections. */
export async function getUserConnections(db: Database, userId: string) {
  return db.select().from(connections).where(eq(connections.userId, userId));
}
