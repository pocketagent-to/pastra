import { connections, users } from '@pastra/db';
import { computeDraft, prepareWeek, publishDrop, selectOffers, syncConnection } from '@pastra/core';
import type { WorkerDeps } from './deps';

/**
 * Run the full weekly drop (docs/architecture.md section 9). Prepares the week, syncs every
 * connection into it, computes draft snapshots, selects offers, then publishes atomically. The
 * individual steps are idempotent, so re-running is safe.
 */
export async function runDrop(
  deps: WorkerDeps,
  params: { week: string; prevWeek?: string; dropAt: Date },
): Promise<{ users: number; connections: number }> {
  const core = { db: deps.db, catalog: deps.catalog, cipher: deps.cipher, registry: deps.registry };
  const { db, catalog } = core;

  await prepareWeek(db, { week: params.week, dropAt: params.dropAt });

  const allUsers = await db
    .select({ id: users.id, country: users.country, offersConsent: users.offersConsent })
    .from(users);
  const allConnections = await db.select({ id: connections.id }).from(connections);

  // Step 2: sync every connection into the new week (each provider has its own rate limit).
  for (const conn of allConnections) {
    await syncConnection(core, { connectionId: conn.id, week: params.week });
  }

  const userIds = allUsers.map((u) => u.id);
  // Step 3: draft snapshots. Step 5: offers per user.
  await computeDraft(db, catalog, { week: params.week, userIds });
  for (const u of allUsers) {
    await selectOffers(db, catalog, {
      userId: u.id,
      week: params.week,
      country: u.country ?? undefined,
      offersConsent: u.offersConsent,
    });
  }

  // Step 6: publish atomically (drafts -> live, previous week closed, offers expired, recaps).
  await publishDrop(db, catalog, { week: params.week, prevWeek: params.prevWeek, userIds });

  return { users: allUsers.length, connections: allConnections.length };
}
