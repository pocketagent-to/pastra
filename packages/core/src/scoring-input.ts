import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import type { Catalog, ProviderId } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import {
  cardAccounts,
  connections,
  friendships,
  metricExtras,
  metricValues,
  stamps,
  users,
} from '@pastra/db';
import type { ScoringConnection, ScoringInput, StampRecord } from '@pastra/scoring';

function toStampRecord(catalog: Catalog, key: string, tier: number | null): StampRecord | null {
  const spec = catalog.stamps.find((s) => s.key === key);
  if (!spec) return null;
  return {
    key: spec.key,
    axis: spec.axis,
    kind: spec.kind,
    label: spec.label,
    ...(tier !== null ? { tier } : {}),
  };
}

/**
 * Read everything the pure scorer needs for a user and week from the database and assemble a
 * {@link ScoringInput}. This is the single glue point between storage and scoring.
 */
export async function buildScoringInput(
  db: Database,
  catalog: Catalog,
  params: { userId: string; week: string },
): Promise<ScoringInput> {
  const { userId, week } = params;

  const conns = await db.select().from(connections).where(eq(connections.userId, userId));
  const connIds = conns.map((c) => c.id);

  const [mvs, mes] = await Promise.all([
    connIds.length
      ? db
          .select()
          .from(metricValues)
          .where(and(inArray(metricValues.connectionId, connIds), eq(metricValues.week, week)))
      : Promise.resolve([]),
    connIds.length
      ? db
          .select()
          .from(metricExtras)
          .where(and(inArray(metricExtras.connectionId, connIds), eq(metricExtras.week, week)))
      : Promise.resolve([]),
  ]);

  const metricsByConn = new Map<string, Record<string, number | null>>();
  const extrasByConn = new Map<string, Record<string, unknown>>();
  for (const row of mvs) {
    const bucket = metricsByConn.get(row.connectionId) ?? {};
    bucket[row.metricKey] = row.value;
    metricsByConn.set(row.connectionId, bucket);
  }
  for (const row of mes) {
    const bucket = extrasByConn.get(row.connectionId) ?? {};
    bucket[row.key] = row.value;
    extrasByConn.set(row.connectionId, bucket);
  }

  const scoringConnections: ScoringConnection[] = conns.map((c) => ({
    provider: c.provider as ProviderId,
    status: c.status,
    staleWeeks: c.staleWeeks,
    metrics: metricsByConn.get(c.id) ?? {},
    extras: extrasByConn.get(c.id) ?? {},
  }));

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const friends = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userA, userId), eq(friendships.userB, userId)));
  const rewardedFriends = friends.filter((f) => f.source === 'invite' && f.rewarded).length;

  const [card] = await db.select().from(cardAccounts).where(eq(cardAccounts.userId, userId));
  const hasCard = card?.cardStatus === 'active' || card?.cardStatus === 'frozen';

  const stampRows = await db
    .select()
    .from(stamps)
    .where(and(eq(stamps.userId, userId), isNull(stamps.revokedAt)));
  const existingStamps = stampRows
    .map((s) => toStampRecord(catalog, s.stampKey, s.tier))
    .filter((s): s is StampRecord => s !== null);

  const hasEns = mes.some((e) => e.key === 'hasEns' && e.value === true);

  return {
    week,
    connections: scoringConnections,
    rewardedFriends,
    hasEns,
    hasCard,
    country: user?.country ?? undefined,
    existingStamps,
    peakPoints: user?.peakPoints ?? 0,
  };
}
