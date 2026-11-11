import { inArray, lt } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { loginChallenges, sessions, syncRuns } from '@pastra/db';

/**
 * Retention sweep (docs/architecture.md section 14): delete rows that grow forever and are only ever
 * looked up while valid. Conservative on purpose — only ephemeral auth/log data, never user-facing
 * history (recaps, snapshots, metric values), whose retention is a product decision. Deletes are
 * chunked so a first run never takes a long lock on Neon. Counts only (ids/dates), nothing logged.
 */
const BATCH = 5000;

/** How many days of sync logs to keep. */
const SYNC_RUN_RETENTION_DAYS = 90;

export interface RetentionResult {
  loginChallenges: number;
  sessions: number;
  syncRuns: number;
}

async function sweep(selectBatch: () => Promise<{ id: string }[]>, del: (ids: string[]) => Promise<unknown>): Promise<number> {
  let total = 0;
  for (;;) {
    const rows = await selectBatch();
    if (rows.length === 0) break;
    await del(rows.map((r) => r.id));
    total += rows.length;
  }
  return total;
}

export async function pruneExpired(
  db: Database,
  params: { now?: Date } = {},
): Promise<RetentionResult> {
  const now = params.now ?? new Date();
  const syncRunCutoff = new Date(now.getTime() - SYNC_RUN_RETENTION_DAYS * 86_400_000);

  const loginChallengesDeleted = await sweep(
    () =>
      db
        .select({ id: loginChallenges.id })
        .from(loginChallenges)
        .where(lt(loginChallenges.expiresAt, now))
        .limit(BATCH),
    (ids) => db.delete(loginChallenges).where(inArray(loginChallenges.id, ids)),
  );
  const sessionsDeleted = await sweep(
    () =>
      db.select({ id: sessions.id }).from(sessions).where(lt(sessions.expiresAt, now)).limit(BATCH),
    (ids) => db.delete(sessions).where(inArray(sessions.id, ids)),
  );
  const syncRunsDeleted = await sweep(
    () =>
      db
        .select({ id: syncRuns.id })
        .from(syncRuns)
        .where(lt(syncRuns.createdAt, syncRunCutoff))
        .limit(BATCH),
    (ids) => db.delete(syncRuns).where(inArray(syncRuns.id, ids)),
  );

  return {
    loginChallenges: loginChallengesDeleted,
    sessions: sessionsDeleted,
    syncRuns: syncRunsDeleted,
  };
}
