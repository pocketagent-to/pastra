import { and, eq, inArray, ne } from 'drizzle-orm';
import type { Axis, Catalog } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { passSnapshots, recaps, userOffers, weeks } from '@pastra/db';
import { computePass, type PassResult } from '@pastra/scoring';
import { persistSnapshot, recompute } from './recompute';
import { buildScoringInputs } from './scoring-input';

/** Create the week row in `preparing` state (step 1 of the drop, T-24h). */
export async function prepareWeek(
  db: Database,
  params: { week: string; dropAt: Date },
): Promise<void> {
  await db
    .insert(weeks)
    .values({ week: params.week, dropAt: params.dropAt, status: 'preparing' })
    .onConflictDoNothing();
}

/**
 * Compute draft snapshots for a batch of users (step 3, T-1h). No stamps are awarded yet. The
 * scoring inputs are loaded for the whole batch in one set of queries (not ~7 per user).
 */
export async function computeDraft(
  db: Database,
  catalog: Catalog,
  params: { week: string; userIds: string[] },
): Promise<void> {
  const { week, userIds } = params;
  const inputs = await buildScoringInputs(db, catalog, { userIds, week });
  for (const userId of userIds) {
    const input = inputs.get(userId);
    if (!input) continue;
    const result = computePass(input, catalog);
    await persistSnapshot(db, { userId, week, state: 'draft', result });
  }
}

function buildRecapPayload(
  prevLevel: number | undefined,
  result: PassResult,
  prevAxes: Record<string, number> | undefined,
): Record<string, unknown> {
  const axisDeltas = AXES.map((axis) => ({
    axis,
    delta: result.axes[axis as Axis].score - (prevAxes?.[axis] ?? 0),
  }))
    .filter((d) => d.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    .slice(0, 3);
  return {
    levelFrom: prevLevel ?? result.level,
    levelTo: result.level,
    axisDeltas,
    newStamps: result.stamps.awarded.map((s) => s.label),
  };
}

/**
 * Promote the drop (step 6, T): one transaction flips the new week's drafts to live, closes the
 * previous week and expires its offers. Guarded by the week status so a retried/duplicate promote is
 * a no-op: only the first run (status still 'preparing') claims the week and flips drafts live —
 * without the guard a second run would delete the live snapshots and find no drafts, wiping the
 * week. Does not touch per-user data, so it runs once for the whole drop. Returns true if it
 * promoted, false if the week was already published.
 */
export async function promoteWeek(
  db: Database,
  params: { week: string; prevWeek?: string },
): Promise<boolean> {
  const { week, prevWeek } = params;
  let claimed = false;
  await db.transaction(async (tx) => {
    const rows = await tx
      .update(weeks)
      .set({ status: 'live' })
      .where(and(eq(weeks.week, week), eq(weeks.status, 'preparing')))
      .returning({ week: weeks.week });
    if (rows.length === 0) return; // already promoted
    claimed = true;

    await tx
      .delete(passSnapshots)
      .where(and(eq(passSnapshots.week, week), eq(passSnapshots.state, 'live')));
    await tx
      .update(passSnapshots)
      .set({ state: 'live' })
      .where(and(eq(passSnapshots.week, week), eq(passSnapshots.state, 'draft')));
    if (prevWeek) {
      await tx.update(weeks).set({ status: 'closed' }).where(eq(weeks.week, prevWeek));
      await tx
        .update(userOffers)
        .set({ state: 'expired' })
        .where(and(eq(userOffers.week, prevWeek), ne(userOffers.state, 'expired')));
    }
  });
  return claimed;
}

/**
 * Award stamps on the newly-live pass and write each user's recap (step 6, after the promote). Runs
 * per chunk of users during the drop; the previous week's snapshots are read once for the chunk. The
 * recap insert is idempotent per (user, week), so a retry never duplicates a recap.
 */
export async function writeRecaps(
  db: Database,
  catalog: Catalog,
  params: { week: string; prevWeek?: string; userIds: string[] },
): Promise<void> {
  const { week, prevWeek, userIds } = params;
  if (userIds.length === 0) return;

  const prevByUser = new Map<string, { level: number; axes: Record<string, number> }>();
  if (prevWeek) {
    const prevRows = await db
      .select()
      .from(passSnapshots)
      .where(
        and(
          inArray(passSnapshots.userId, userIds),
          eq(passSnapshots.week, prevWeek),
          eq(passSnapshots.state, 'live'),
        ),
      );
    for (const snap of prevRows) {
      const axes: Record<string, number> = {};
      for (const axis of AXES) {
        axes[axis] = (snap.axes as Record<string, { score: number }>)[axis]?.score ?? 0;
      }
      prevByUser.set(snap.userId, { level: snap.level, axes });
    }
  }

  for (const userId of userIds) {
    const result = await recompute(db, catalog, { userId, week, state: 'live' });
    const prev = prevByUser.get(userId);
    await db
      .insert(recaps)
      .values({ userId, week, payload: buildRecapPayload(prev?.level, result, prev?.axes) })
      .onConflictDoNothing({ target: [recaps.userId, recaps.week] });
  }
}

/** Publish the drop: promote the week once, then award stamps and write recaps for every user. */
export async function publishDrop(
  db: Database,
  catalog: Catalog,
  params: { week: string; prevWeek?: string; userIds: string[] },
): Promise<void> {
  await promoteWeek(db, { week: params.week, prevWeek: params.prevWeek });
  await writeRecaps(db, catalog, {
    week: params.week,
    prevWeek: params.prevWeek,
    userIds: params.userIds,
  });
}
