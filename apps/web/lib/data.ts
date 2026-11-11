import { redirect } from 'next/navigation';
import { AXES, catalog, type Axis } from '@pastra/catalog';
import {
  currentWeek,
  getLivePass,
  getUserConnections,
  getUserStamps,
  getVisibility,
} from '@pastra/core';
import { computeRarity, type Rarity } from '@pastra/scoring';
import { getDb } from './server';
import { getCachedDropAtISO } from './live-week';
import { getSessionUser } from './session';

type VisLevel = 'everyone' | 'friends' | 'me';

/** Require a signed-in user with a handle; otherwise redirect into the right onboarding step. */
export async function requireUser() {
  const user = await getSessionUser();
  if (!user) redirect('/signup');
  if (!user.handle) redirect('/onboarding/name');
  return user;
}

export interface PassAxisView {
  score: number;
  delta: number;
  topPct: number | null;
  visibility: VisLevel;
}

export interface PassView {
  handle: string;
  displayName: string | null;
  level: number;
  points: number;
  title: string;
  rarity: Rarity;
  week: string;
  nextDropAt: string;
  serverNow: string;
  axes: Record<Axis, PassAxisView>;
  keyNumbers: Array<{ provider: string; axis: Axis; value: string; label: string }>;
  stamps: Array<{ key: string; label: string; axis: Axis | 'all'; isNew: boolean }>;
  empty: boolean;
}

function stampLabel(key: string, tier: number | null): { label: string; axis: Axis | 'all' } {
  const spec = catalog.stamps.find((s) => s.key === key);
  if (!spec) return { label: key, axis: 'all' };
  if (spec.tiers && tier !== null) {
    const t = spec.tiers.find((x) => x.tier === tier);
    return { label: t?.label ?? spec.label, axis: spec.axis };
  }
  return { label: spec.label, axis: spec.axis };
}

/**
 * Just the card-face fields for a signed-in user (handle, level, rarity). A lean read for screens
 * that only need the card head — avoids getPassView's visibility/stamps/drop assembly.
 */
export async function getCardFace(user: {
  id: string;
  handle: string | null;
}): Promise<{ handle: string; level: number; rarity: Rarity }> {
  const snapshot = await getLivePass(getDb(), user.id, currentWeek());
  const level = snapshot?.level ?? 1;
  return { handle: user.handle ?? '', level, rarity: computeRarity(level) };
}

/** Build the Pass view for a signed-in user from the live snapshot (empty if none yet). */
export async function getPassView(user: {
  id: string;
  handle: string | null;
  displayName: string | null;
}): Promise<PassView> {
  const db = getDb();
  const week = currentWeek();
  const [snapshot, visRows, stampRows, dropAtISO] = await Promise.all([
    getLivePass(db, user.id, week),
    getVisibility(db, user.id),
    getUserStamps(db, user.id),
    getCachedDropAtISO(),
  ]);

  const vis = new Map(visRows.map((v) => [v.axis, v.level as VisLevel]));
  const snapAxes = (snapshot?.axes ?? {}) as Record<
    string,
    { score: number; topPct: number | null }
  >;

  const axes = {} as Record<Axis, PassAxisView>;
  for (const axis of AXES) {
    axes[axis] = {
      score: snapAxes[axis]?.score ?? 0,
      delta: 0,
      topPct: snapAxes[axis]?.topPct ?? null,
      visibility: vis.get(axis) ?? (axis === 'sports' ? 'me' : 'everyone'),
    };
  }

  const level = snapshot?.level ?? 1;
  return {
    handle: user.handle ?? '',
    displayName: user.displayName,
    level,
    points: snapshot?.points ?? 0,
    title: snapshot?.title ?? 'Newcomer',
    rarity: computeRarity(level),
    week,
    nextDropAt: dropAtISO ?? new Date(Date.now() + 3 * 86_400_000).toISOString(),
    serverNow: new Date().toISOString(),
    axes,
    keyNumbers: (snapshot?.keyNumbers ?? []) as PassView['keyNumbers'],
    stamps: stampRows.map((s) => ({
      ...stampLabel(s.stampKey, s.tier),
      key: s.stampKey,
      isNew: s.awardedWeek === week,
    })),
    empty: !snapshot,
  };
}

/** Per-provider connection state for the Services screen. */
export async function getConnectionState(
  userId: string,
): Promise<Map<string, 'connected' | 'needs_reconnect' | 'error'>> {
  const conns = await getUserConnections(getDb(), userId);
  const map = new Map<string, 'connected' | 'needs_reconnect' | 'error'>();
  for (const c of conns) map.set(c.provider, c.status);
  return map;
}
