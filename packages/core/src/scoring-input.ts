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
 * Read everything the pure scorer needs for a user and week and assemble a {@link ScoringInput}.
 * This is the single glue point between storage and scoring.
 */
export async function buildScoringInput(
  db: Database,
  catalog: Catalog,
  params: { userId: string; week: string },
): Promise<ScoringInput> {
  const map = await buildScoringInputs(db, catalog, {
    userIds: [params.userId],
    week: params.week,
  });
  return map.get(params.userId) ?? emptyInput(params.week);
}

function emptyInput(week: string): ScoringInput {
  return {
    week,
    connections: [],
    rewardedFriends: 0,
    hasEns: false,
    hasCard: false,
    country: undefined,
    existingStamps: [],
    peakPoints: 0,
  };
}

/**
 * Batched {@link buildScoringInput} for a chunk of users and one week: loads every table once with
 * `inArray` and assembles each user's input in memory. The weekly drop uses this to replace ~7
 * queries per user with ~7 per chunk; results are byte-for-byte identical to the per-user path. A
 * {@link ScoringInput} is returned for every requested user, even one with no connections.
 */
export async function buildScoringInputs(
  db: Database,
  catalog: Catalog,
  params: { userIds: string[]; week: string },
): Promise<Map<string, ScoringInput>> {
  const { userIds, week } = params;
  const out = new Map<string, ScoringInput>();
  if (userIds.length === 0) return out;

  const conns = await db.select().from(connections).where(inArray(connections.userId, userIds));
  const connIds = conns.map((c) => c.id);
  const connsByUser = new Map<string, typeof conns>();
  for (const c of conns) {
    const bucket = connsByUser.get(c.userId) ?? [];
    bucket.push(c);
    connsByUser.set(c.userId, bucket);
  }

  const [mvs, mes, userRows, friends, cards, stampRows] = await Promise.all([
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
    db.select().from(users).where(inArray(users.id, userIds)),
    db
      .select()
      .from(friendships)
      .where(or(inArray(friendships.userA, userIds), inArray(friendships.userB, userIds))),
    db.select().from(cardAccounts).where(inArray(cardAccounts.userId, userIds)),
    db
      .select()
      .from(stamps)
      .where(and(inArray(stamps.userId, userIds), isNull(stamps.revokedAt))),
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

  const userById = new Map(userRows.map((u) => [u.id, u]));
  const cardByUser = new Map(cards.map((c) => [c.userId, c]));

  const wanted = new Set(userIds);
  const rewardedByUser = new Map<string, number>();
  for (const f of friends) {
    if (f.source !== 'invite' || !f.rewarded) continue;
    if (wanted.has(f.userA)) rewardedByUser.set(f.userA, (rewardedByUser.get(f.userA) ?? 0) + 1);
    if (wanted.has(f.userB)) rewardedByUser.set(f.userB, (rewardedByUser.get(f.userB) ?? 0) + 1);
  }

  const stampsByUser = new Map<string, StampRecord[]>();
  for (const s of stampRows) {
    const record = toStampRecord(catalog, s.stampKey, s.tier);
    if (!record) continue;
    const bucket = stampsByUser.get(s.userId) ?? [];
    bucket.push(record);
    stampsByUser.set(s.userId, bucket);
  }

  for (const userId of userIds) {
    const userConns = connsByUser.get(userId) ?? [];
    const scoringConnections: ScoringConnection[] = userConns.map((c) => ({
      provider: c.provider as ProviderId,
      status: c.status,
      staleWeeks: c.staleWeeks,
      metrics: metricsByConn.get(c.id) ?? {},
      extras: extrasByConn.get(c.id) ?? {},
    }));
    const hasEns = userConns.some((c) => (extrasByConn.get(c.id) ?? {}).hasEns === true);
    const card = cardByUser.get(userId);
    const user = userById.get(userId);

    out.set(userId, {
      week,
      connections: scoringConnections,
      rewardedFriends: rewardedByUser.get(userId) ?? 0,
      hasEns,
      hasCard: card?.cardStatus === 'active' || card?.cardStatus === 'frozen',
      country: user?.country ?? undefined,
      existingStamps: stampsByUser.get(userId) ?? [],
      peakPoints: user?.peakPoints ?? 0,
    });
  }

  return out;
}
