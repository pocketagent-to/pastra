import { unstable_cache } from 'next/cache';
import { getLiveWeek } from '@pastra/core';
import { getDb } from './server';

/**
 * The live week is global (identical for every user) and changes only at the weekly drop, yet it was
 * re-queried on every authed Pass and Offers render. Cache just the drop time (as an ISO string, so
 * nothing Date-shaped goes through the data cache) with a 60s revalidate — the countdown is computed
 * client-side from this value, so a slightly stale drop time is harmless. Uses Next's built-in data
 * cache; no Redis/KV required.
 */
export const getCachedDropAtISO = unstable_cache(
  async (): Promise<string | null> => {
    const row = await getLiveWeek(getDb());
    return row?.dropAt ? new Date(row.dropAt).toISOString() : null;
  },
  ['live-week-drop-at'],
  { revalidate: 60 },
);
