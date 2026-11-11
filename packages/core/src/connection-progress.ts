import { and, desc, eq } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { connections, metricValues, syncRuns } from '@pastra/db';
import { CoreError } from './errors';

/** A connection's first-sync status for the Building screen poll (docs/product-spec.md section 12). */
export interface ConnectionProgress {
  /** Latest sync-run status for the week, or `pending` before any run has been recorded. */
  status: 'pending' | 'ok' | 'failed' | 'skipped';
  /** Metric keys stored for this connection and week so far (e.g. `steam.hours_total`). */
  metricsFound: string[];
  /** True once a sync run has been recorded for the week (the sync has finished, ok or failed). */
  done: boolean;
}

/**
 * Progress of a connection's first sync, for the Building screen poll (docs/product-spec.md
 * section 12). Verifies the connection belongs to the user, then reports which metric keys have
 * landed this week and the latest sync-run status. Only metric *keys* are returned — never values
 * (metric values are in the never-log list, architecture section 14).
 */
export async function getConnectionProgress(
  db: Database,
  userId: string,
  connectionId: string,
  week: string,
): Promise<ConnectionProgress> {
  const [conn] = await db.select().from(connections).where(eq(connections.id, connectionId));
  if (!conn || conn.userId !== userId) throw new CoreError('not_found', 'connection');

  const mvs = await db
    .select({ metricKey: metricValues.metricKey })
    .from(metricValues)
    .where(and(eq(metricValues.connectionId, connectionId), eq(metricValues.week, week)));
  const metricsFound = mvs.map((m) => m.metricKey).sort();

  const [run] = await db
    .select({ status: syncRuns.status })
    .from(syncRuns)
    .where(and(eq(syncRuns.connectionId, connectionId), eq(syncRuns.week, week)))
    .orderBy(desc(syncRuns.createdAt))
    .limit(1);

  return {
    status: run?.status ?? 'pending',
    metricsFound,
    done: run !== undefined,
  };
}
