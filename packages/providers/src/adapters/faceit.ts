import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { BeginContext, BeginResult, FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * FACEIT adapter (hybrid, like Steam). OAuth 2.0 / OpenID Connect proves *which* FACEIT account the
 * user owns; the metrics then come from the public Data API read with our server-side Data API key —
 * never the user's token. The generic OAuth2 adapter handles begin/complete/refresh; this file
 * supplies the FACEIT endpoints, scopes, `identify` (userinfo -> player guid) and `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `faceit.matches`      volume    lifetime matches played on the user's primary game
 *   - `faceit.matches_30d`  activity  delta_30d of `faceit.matches` (we return the cumulative value;
 *                                     core derives the 30-day delta from our snapshots)
 *   - `faceit.level`        depth     FACEIT skill level (1-10) on the primary game
 *
 * Flow:
 *   begin/complete  OAuth2 + PKCE against accounts.faceit.com; the token endpoint uses HTTP Basic
 *                   client auth. `identify` calls the OIDC userinfo endpoint and takes the account
 *                   `guid` (== Data-API player_id) as the external id (one account = one pass).
 *   fetch           Data API GET /players/{player_id} for the games map + skill level, then
 *                   GET /players/{player_id}/stats/{game} for lifetime "Matches". Both use the
 *                   server Data API key; the user's OAuth token is not needed for metrics.
 *
 * We read only counts and the skill level — never chat, email or match history details.
 */

const AUTHORIZE_URL = 'https://accounts.faceit.com/accounts';
const TOKEN_URL = 'https://api.faceit.com/auth/v1/oauth/token';
const USERINFO_URL = 'https://api.faceit.com/auth/v1/resources/userinfo';
const DATA_API_BASE = 'https://open.faceit.com/data/v4';

/** Minimal OIDC scope: enough for the userinfo `guid`/`sub`. We deliberately never ask for email. */
const SCOPES = ['openid'] as const;

/**
 * Games a FACEIT player can have, in the order we treat as "primary". FACEIT is predominantly CS;
 * cs2 superseded csgo. If the player has none of these, we fall back to their highest-level game.
 */
const GAME_PREFERENCE = ['cs2', 'csgo'] as const;

/** The lifetime-stats field that holds the match total (Data API returns stats as strings). */
const MATCHES_FIELD = 'Matches';

export interface FaceitAdapterConfig {
  /** OAuth client id from the FACEIT developer portal (developers.faceit.com). */
  clientId: string;
  /** OAuth client secret (used for HTTP Basic client auth on the token endpoint). */
  clientSecret: string;
  /** Server-side Data API key from the FACEIT developer portal; authorizes open.faceit.com reads. */
  dataApiKey: string;
}

/** OIDC userinfo response; `guid` is FACEIT's account id and equals the Data-API player_id. */
interface UserInfo {
  guid?: string;
  sub?: string;
  nickname?: string;
}

interface PlayerGame {
  skill_level?: number;
  faceit_elo?: number;
  game_player_id?: string;
}

/** Data API GET /players/{id} (and /players?nickname=...). */
interface PlayerDetails {
  player_id?: string;
  nickname?: string;
  games?: Record<string, PlayerGame>;
}

/** Data API GET /players/{id}/stats/{game}; lifetime values are strings. */
interface PlayerStats {
  lifetime?: Record<string, string>;
}

/** A Data API GET authorized with the server-side key. */
function dataGet<T>(path: string, dataApiKey: string): Promise<T> {
  return httpJson<T>(`${DATA_API_BASE}${path}`, { headers: bearer(dataApiKey) });
}

/** Choose the primary game: a preferred CS title if present, else the highest-level game. */
function pickGame(games: Record<string, PlayerGame> | undefined): string | undefined {
  if (!games) return undefined;
  for (const pref of GAME_PREFERENCE) {
    if (pref in games) return pref;
  }
  let best: string | undefined;
  let bestLevel = -1;
  for (const [key, game] of Object.entries(games)) {
    const level = game?.skill_level ?? 0;
    if (level > bestLevel) {
      bestLevel = level;
      best = key;
    }
  }
  return best;
}

/** Lifetime match count for a game, or null when the player has no stats there. */
async function fetchMatches(
  playerId: string,
  game: string,
  dataApiKey: string,
): Promise<number | null> {
  let stats: PlayerStats;
  try {
    stats = await dataGet<PlayerStats>(
      `/players/${encodeURIComponent(playerId)}/stats/${encodeURIComponent(game)}`,
      dataApiKey,
    );
  } catch (error) {
    // No stats for this game (404) -> null; a transient upstream failure or rate limit must stop the
    // whole sync so the core can back off and retry.
    if (
      error instanceof AdapterError &&
      (error.code === 'rate_limited' || error.code === 'provider_down')
    ) {
      throw error;
    }
    return null;
  }
  const raw = stats.lifetime?.[MATCHES_FIELD];
  if (raw == null) return null;
  const matches = Number(raw);
  return Number.isFinite(matches) ? Math.round(matches) : null;
}

/**
 * FACEIT adapter. OAuth login proves the account `guid`; metrics are read with the application's
 * Data API key injected via config. An unconfigured adapter (missing client credentials or Data API
 * key) refuses to begin so the registry can fall back to the stub.
 */
export function createFaceitAdapter(cfg: FaceitAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret, dataApiKey } = cfg;

  /** Resolve the connected account's player_id from the OIDC userinfo endpoint. */
  async function identify(tokens: Tokens): Promise<string> {
    const info = await httpJson<UserInfo>(USERINFO_URL, { headers: bearer(tokens.access) });
    const guid = info.guid ?? info.sub;
    if (guid) return guid;
    // Fallback: resolve the player_id by nickname via the Data API.
    if (info.nickname) {
      const player = await dataGet<PlayerDetails>(
        `/players?nickname=${encodeURIComponent(info.nickname)}`,
        dataApiKey,
      );
      if (player.player_id) return player.player_id;
    }
    throw new AdapterError('unexpected_response', 'FACEIT userinfo returned no account id');
  }

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const player = await dataGet<PlayerDetails>(
      `/players/${encodeURIComponent(args.externalId)}`,
      dataApiKey,
    );
    const game = pickGame(player.games);

    const rawLevel = game ? player.games?.[game]?.skill_level : undefined;
    const level = typeof rawLevel === 'number' ? rawLevel : null;
    const matches = game ? await fetchMatches(args.externalId, game, dataApiKey) : null;

    return {
      metrics: {
        'faceit.matches': matches,
        // delta_30d: return the cumulative value its delta is taken of; core computes the 30d delta.
        'faceit.matches_30d': matches,
        'faceit.level': level,
      },
      extras: game ? { game } : undefined,
    };
  }

  const base = createOAuth2Adapter({
    id: 'faceit',
    auth: 'oauth2',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // FACEIT mandates PKCE and authenticates the client with HTTP Basic on the token endpoint.
    usePkce: true,
    clientAuth: 'basic',
    // Force the full-page redirect flow (otherwise FACEIT answers via popup postMessage).
    authorizeParams: { redirect_popup: 'true' },
    identify,
    fetchMetrics,
  });

  // The generic adapter already refuses to begin without client credentials; also require the Data
  // API key, since metrics are unreadable without it.
  return {
    ...base,
    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!dataApiKey) throw new AdapterError('provider_down', 'faceit is not configured');
      return base.begin(ctx);
    },
  };
}
