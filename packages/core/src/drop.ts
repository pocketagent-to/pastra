import { and, eq, ne } from 'drizzle-orm';
import type { Axis, Catalog } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { passSnapshots, recaps, userOffers, weeks } from '@pastra/db';
import type { PassResult } from '@pastra/scoring';
import { recompute } from './recompute';

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

/** Compute draft snapshots for a batch of users (step 3, T-1h). No stamps are awarded yet. */
export async function computeDraft(
  db: Database,
  catalog: Catalog,
  params: { week: string; userIds: string[] },
): Promise<void> {
  for (const userId of params.userIds) {
    await recompute(db, catalog, { userId, week: params.week, state: 'draft' });
  }
}

async function getLiveSnapshot(db: Database, userId: string, week: string) {
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
  return row;
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
 * Publish the drop (step 6, T): one transaction flips the new week's drafts to live, closes the
 * previous week and expires its offers; then stamps are awarded and a recap is built per user.
 */
export async function publishDrop(
  db: Database,
  catalog: Catalog,
  params: { week: string; prevWeek?: string; userIds: string[] },
): Promise<void> {
  const { week, prevWeek, userIds } = params;

  const prevByUser = new Map<string, { level: number; axes: Record<string, number> }>();
  if (prevWeek) {
    for (const userId of userIds) {
      const snap = await getLiveSnapshot(db, userId, prevWeek);
      if (snap) {
        const axes: Record<string, number> = {};
        for (const axis of AXES) {
          axes[axis] = (snap.axes as Record<string, { score: number }>)[axis]?.score ?? 0;
        }
        prevByUser.set(userId, { level: snap.level, axes });
      }
    }
  }

  await db.transaction(async (tx) => {
    // Idempotent promote: drop any existing live snapshot for this week, then flip the drafts live.
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
    await tx.update(weeks).set({ status: 'live' }).where(eq(weeks.week, week));
  });

  for (const userId of userIds) {
    const result = await recompute(db, catalog, { userId, week, state: 'live' });
    const prev = prevByUser.get(userId);
    await db
      .insert(recaps)
      .values({ userId, week, payload: buildRecapPayload(prev?.level, result, prev?.axes) });
  }
}
