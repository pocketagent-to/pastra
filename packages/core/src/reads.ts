import { and, eq } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { passSnapshots, userOffers, weeks } from '@pastra/db';
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
