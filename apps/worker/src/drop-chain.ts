import type { ProviderId } from '@pastra/catalog';
import {
  computeDraft,
  createProviderLimiter,
  listActiveOffers,
  mondayOf,
  pageConnectionsForSync,
  pageUserIds,
  pageUsersForDrop,
  prepareWeek,
  promoteWeek,
  selectOffers,
  syncConnection,
  writeRecaps,
} from '@pastra/core';
import type { WorkerDeps } from './deps';

/** Rows per keyset page — bounds worker memory (one page of ids, never the whole table). */
const PAGE = 500;
/** Consecutive provider_down failures before a provider is skipped for the rest of this drop. */
const BREAKER_THRESHOLD = 8;

export interface DropResult {
  users: number;
  connections: number;
  synced: number;
  failed: number;
}

/** Whole weeks between two week strings (`b - a`), using the Monday of each. */
function weekGap(a: string, b: string): number {
  return Math.round((mondayOf(b).getTime() - mondayOf(a).getTime()) / (7 * 86_400_000));
}

/**
 * Run the full weekly drop (docs/architecture.md section 9). Still one worker entry point, but
 * hardened for scale: connections are synced concurrently, throttled per provider from the catalog
 * rate limits, with a circuit breaker that skips a provider after repeated outages; every sync and
 * every per-user step is error-isolated so one bad row never aborts the drop; users and connections
 * are keyset-paginated so the whole table never lives in memory; scoring inputs and the active
 * offers are read in batches. The individual core steps are idempotent, so re-running is safe.
 *
 * Note: this remains a single long-running job. The architecture §9 target is to fan these phases
 * onto separate pg-boss queues (one job per connection, time-based barriers) for horizontal scale
 * and crash-resume; that step needs a staging environment to validate the queue wiring and is
 * tracked as the next change.
 */
export async function runDrop(
  deps: WorkerDeps,
  params: { week: string; prevWeek?: string; dropAt: Date },
): Promise<DropResult> {
  const core = { db: deps.db, catalog: deps.catalog, cipher: deps.cipher, registry: deps.registry };
  const { db, catalog } = core;
  const { week, prevWeek } = params;

  await prepareWeek(db, { week, dropAt: params.dropAt });

  // ---- Phase 2: sync connections (concurrent, per-provider throttled, circuit-broken) ----
  const limiter = createProviderLimiter((id) => {
    const spec = catalog.providerById.get(id as ProviderId);
    return spec ? spec.rateLimit : { perMinute: 60, concurrency: 2 };
  });
  const downStreak = new Map<string, number>();
  const skipped = new Set<string>();
  let connectionCount = 0;
  let synced = 0;
  let failed = 0;

  /** Is this connection due this drop, honouring the provider's syncEveryNthDrop cadence? */
  const isDue = (provider: string, lastSyncedWeek: string | null): boolean => {
    const spec = catalog.providerById.get(provider as ProviderId);
    const cadence = spec?.syncEveryNthDrop ?? 1;
    if (cadence <= 1 || !lastSyncedWeek) return true;
    return weekGap(lastSyncedWeek, week) >= cadence;
  };

  let connCursor = '';
  for (;;) {
    const page = await pageConnectionsForSync(db, connCursor, PAGE);
    if (page.length === 0) break;
    connCursor = page[page.length - 1]!.id;

    await Promise.all(
      page.map((conn) => {
        connectionCount += 1;
        if (skipped.has(conn.provider) || !isDue(conn.provider, conn.lastSyncedWeek)) {
          return Promise.resolve();
        }
        return limiter.run(conn.provider, async () => {
          if (skipped.has(conn.provider)) return; // breaker tripped while queued
          try {
            const res = await syncConnection(core, { connectionId: conn.id, week });
            if (res.status === 'ok') {
              synced += 1;
              downStreak.set(conn.provider, 0);
              return;
            }
            failed += 1;
            if (res.code === 'provider_down') {
              const streak = (downStreak.get(conn.provider) ?? 0) + 1;
              downStreak.set(conn.provider, streak);
              if (streak >= BREAKER_THRESHOLD) skipped.add(conn.provider);
            }
          } catch {
            // syncConnection swallows provider errors; reaching here is an unexpected (e.g. DB) error
            // for this one connection — isolate it so the drop continues.
            failed += 1;
          }
        });
      }),
    );
    if (page.length < PAGE) break;
  }

  // ---- Phase 3: draft snapshots + offers, per user chunk ----
  const activeOffers = await listActiveOffers(db);
  let userCount = 0;
  let userCursor = '';
  for (;;) {
    const page = await pageUsersForDrop(db, userCursor, PAGE);
    if (page.length === 0) break;
    userCursor = page[page.length - 1]!.id;
    userCount += page.length;

    const userIds = page.map((u) => u.id);
    await computeDraft(db, catalog, { week, userIds });
    for (const u of page) {
      try {
        await selectOffers(db, catalog, {
          userId: u.id,
          week,
          country: u.country ?? undefined,
          offersConsent: u.offersConsent,
          offers: activeOffers,
        });
      } catch {
        failed += 1;
      }
    }
    if (page.length < PAGE) break;
  }

  // ---- Phase 4: promote once, then recaps per user chunk ----
  await promoteWeek(db, { week, prevWeek });
  let recapCursor = '';
  for (;;) {
    const page = await pageUserIds(db, recapCursor, PAGE);
    if (page.length === 0) break;
    recapCursor = page[page.length - 1]!.id;
    try {
      const { failed: recapFailed } = await writeRecaps(db, catalog, {
        week,
        prevWeek,
        userIds: page.map((u) => u.id),
      });
      failed += recapFailed; // per-user failures inside the chunk are isolated and counted
    } catch {
      // The chunk's prev-week batch read failed (rare) — the whole chunk's recaps are skipped.
      failed += page.length;
    }
    if (page.length < PAGE) break;
  }

  return { users: userCount, connections: connectionCount, synced, failed };
}
