import { and, eq, isNull } from 'drizzle-orm';
import type { Axis, Catalog } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { passSnapshots, stamps, users } from '@pastra/db';
import { computePass, type PassResult } from '@pastra/scoring';
import { buildScoringInput } from './scoring-input';

function topPctMap(result: PassResult): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const axis of AXES) out[axis] = result.axes[axis as Axis].topPct;
  return out;
}

/**
 * Persist a computed pass as a snapshot (upsert on user+week+state) and carry peak points forward.
 * Shared by the single-user recompute and the batched draft compute, so both write identically.
 */
export async function persistSnapshot(
  db: Database,
  params: { userId: string; week: string; state: 'draft' | 'live'; result: PassResult },
): Promise<void> {
  const { userId, week, state, result } = params;
  await db
    .insert(passSnapshots)
    .values({
      userId,
      week,
      state,
      axes: result.axes as unknown as Record<string, unknown>,
      points: result.points,
      level: result.level,
      title: result.title,
      topPct: topPctMap(result),
      keyNumbers: result.keyNumbers,
    })
    .onConflictDoUpdate({
      target: [passSnapshots.userId, passSnapshots.week, passSnapshots.state],
      set: {
        axes: result.axes as unknown as Record<string, unknown>,
        points: result.points,
        level: result.level,
        title: result.title,
        topPct: topPctMap(result),
        keyNumbers: result.keyNumbers,
        computedAt: new Date(),
      },
    });
  await db.update(users).set({ peakPoints: result.peakPoints }).where(eq(users.id, userId));
}

/**
 * Recompute a user's pass for a week and persist it (docs/architecture.md section 7, 8). Writes the
 * snapshot in the given state, carries the peak points forward (level only grows) and applies the
 * stamp delta. Called immediately after connect/disconnect (`live`) and during the drop (`draft`).
 */
export async function recompute(
  db: Database,
  catalog: Catalog,
  params: { userId: string; week: string; state?: 'draft' | 'live' },
): Promise<PassResult> {
  const { userId, week, state = 'live' } = params;
  const input = await buildScoringInput(db, catalog, { userId, week });
  const result = computePass(input, catalog);

  await persistSnapshot(db, { userId, week, state, result });

  // Stamps are awarded on the live pass only; the drop's draft never hands out stamps early.
  if (state !== 'live') return result;

  // Apply the stamp delta: insert newly awarded, revoke removed service stamps.
  for (const awarded of result.stamps.awarded) {
    await db
      .insert(stamps)
      .values({ userId, stampKey: awarded.key, tier: awarded.tier ?? null, awardedWeek: week });
  }
  for (const revoked of result.stamps.revoked) {
    await db
      .update(stamps)
      .set({ revokedAt: new Date() })
      .where(
        and(eq(stamps.userId, userId), eq(stamps.stampKey, revoked.key), isNull(stamps.revokedAt)),
      );
  }

  return result;
}
