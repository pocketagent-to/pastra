import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * osu! adapter (OAuth 2.0, osu! API v2). The generic OAuth2 adapter handles begin/complete/refresh;
 * this file supplies the osu! endpoints, scopes, `identify` and `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `osu.playtime_hours`  volume    total playtime, from `statistics.play_time` (seconds -> hours)
 *   - `osu.plays_gain_30d`  activity  delta_30d of `osu.play_count` — core derives the 30d delta from
 *                                     our own snapshots, so we return the cumulative `osu.play_count`
 *   - `osu.world_rank`      depth     `statistics.global_rank` (reverse scale: lower is better)
 *
 * We request only `identify public`: `identify` reads the authenticated account (its stable id, the
 * one-account-one-pass external id) and `public` reads public profile statistics. We never request
 * `friends.read`, `chat.*` or any write scope, so messages, friends and email are never read. The
 * consent screen reads playtime, play count and world rank only.
 *
 * `GET /api/v2/me` returns the user's default ruleset (their chosen `playmode`); its `statistics`
 * object carries the aggregate play stats. `global_rank` is null for inactive/unranked accounts.
 */

const AUTHORIZE_URL = 'https://osu.ppy.sh/oauth/authorize';
const TOKEN_URL = 'https://osu.ppy.sh/oauth/token';
const ME_URL = 'https://osu.ppy.sh/api/v2/me';

/** `identify` (read the account) + `public` (read public statistics). Nothing else. */
const SCOPES = ['identify', 'public'] as const;

const SECONDS_PER_HOUR = 3600;

export interface OsuAdapterConfig {
  clientId: string;
  clientSecret: string;
}

/**
 * The `statistics` object on an osu! API v2 user. Only the aggregate fields the catalog needs are
 * typed; `global_rank` is nullable, and older payloads nest it under `rank.global`.
 */
interface OsuUserStatistics {
  /** Performance points (aggregate skill score). */
  pp?: number;
  /** Current world rank; null when the account is inactive/unranked. */
  global_rank?: number | null;
  /** Legacy nesting of the world rank, kept as a fallback. */
  rank?: { global?: number | null };
  /** Lifetime number of plays (cumulative; delta source for `osu.plays_gain_30d`). */
  play_count?: number;
  /** Mean hit accuracy, 0–100. */
  hit_accuracy?: number;
  /** Total ranked score (aggregate). */
  ranked_score?: number;
  /** Lifetime playtime, in seconds. */
  play_time?: number | null;
}

interface OsuMe {
  /** Stable numeric account id; the one-account-one-pass external id (never a metric). */
  id?: number;
  statistics?: OsuUserStatistics;
}

/** Read the authenticated user (default ruleset) with a Bearer token. */
async function readMe(token: string): Promise<OsuMe> {
  return httpJson<OsuMe>(ME_URL, { headers: bearer(token) });
}

/** The world rank, preferring the current `global_rank` field and falling back to the legacy nest. */
function worldRank(stats: OsuUserStatistics | undefined): number | null {
  if (!stats) return null;
  if (typeof stats.global_rank === 'number') return stats.global_rank;
  if (typeof stats.rank?.global === 'number') return stats.rank.global;
  return null;
}

export function createOsuAdapter(cfg: OsuAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  async function identify(tokens: Tokens): Promise<string> {
    const me = await readMe(tokens.access);
    if (typeof me.id !== 'number') throw new AdapterError('unexpected_response', 'osu! returned no account');
    return String(me.id);
  }

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const me = await readMe(args.tokens.access);
    const stats = me.statistics;

    const playtimeHours =
      typeof stats?.play_time === 'number' ? Math.round(stats.play_time / SECONDS_PER_HOUR) : null;
    const playCount = typeof stats?.play_count === 'number' ? stats.play_count : null;

    const extras: Record<string, unknown> = {};
    if (typeof stats?.pp === 'number') extras.pp = stats.pp;
    if (typeof stats?.hit_accuracy === 'number') extras.hitAccuracy = stats.hit_accuracy;
    if (typeof stats?.ranked_score === 'number') extras.rankedScore = stats.ranked_score;

    return {
      metrics: {
        'osu.playtime_hours': playtimeHours,
        // delta_30d: return the cumulative value its delta is taken of; core computes the 30d delta.
        'osu.play_count': playCount,
        'osu.world_rank': worldRank(stats),
      },
      extras,
    };
  }

  return createOAuth2Adapter({
    id: 'osu',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // osu!'s token endpoint takes client_id/client_secret in the body (client_secret_post).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });
}
