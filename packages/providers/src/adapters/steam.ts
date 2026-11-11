import { AdapterError } from '../errors';
import { httpJson } from '../http';
import type {
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
} from '../types';

/**
 * Steam adapter (OpenID 2.0 for login, Web API for metrics; docs/architecture.md section 7).
 *
 * Steam's OpenID only proves ownership of a SteamID64 — there is no per-user token. `begin` sends
 * the user to Steam's OpenID endpoint; `complete` verifies the returned assertion with
 * `check_authentication` and extracts the SteamID64. `fetch` then reads public profile data with
 * the application's Web API key (never a user token), so there is no `refresh` or `revoke`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts), all `source: 'api'`:
 *   - `steam.hours_total`        volume    total hours across owned games
 *   - `steam.games_count`        volume    number of games owned
 *   - `steam.hours_2w`           activity  hours played in the last two weeks
 *   - `steam.achievements_pct`   depth     mean achievement-completion % over the most-played games
 *   - `steam.account_age_years`  depth     account age from the profile's `timecreated`
 *
 * We read only counts and dates: owned games, playtime and achievement completion. We never read
 * friends, messages, purchases or wallet. A public profile whose game list comes back empty means
 * the game-details privacy is on -> `private_data` ("Steam — private profile" screen). Achievements
 * are counted over the top ~20 games by playtime to stay inside the Web API rate limit.
 */

const OPENID_ENDPOINT = 'https://steamcommunity.com/openid/login';
const API_BASE = 'https://api.steampowered.com';
const OPENID_NS = 'http://specs.openid.net/auth/2.0';
const IDENTIFIER_SELECT = 'http://specs.openid.net/auth/2.0/identifier_select';
/** Steam's claimed_id is always `.../openid/id/<17-digit SteamID64>`. */
const CLAIMED_ID_RE = /^https:\/\/steamcommunity\.com\/openid\/id\/(\d{17})$/;
/** Count achievements over at most this many of the most-played games (rate-limit budget). */
const TOP_GAMES_FOR_ACHIEVEMENTS = 20;
const OPENID_TIMEOUT_MS = 15_000;
const SECONDS_PER_YEAR = 365.25 * 24 * 60 * 60;
const MINUTES_PER_HOUR = 60;

export interface SteamConfig {
  /** Steam Web API key, from the env var STEAM_WEB_API_KEY. */
  webApiKey: string;
}

interface PlayerSummary {
  steamid?: string;
  /** 3 = public; anything else hides owned games and (usually) `timecreated`. */
  communityvisibilitystate?: number;
  personaname?: string;
  /** Unix seconds the account was created; absent on non-public or very old profiles. */
  timecreated?: number;
}

interface OwnedGame {
  appid: number;
  name?: string;
  /** Lifetime playtime in minutes. */
  playtime_forever?: number;
  /** Playtime in the last two weeks, in minutes. */
  playtime_2weeks?: number;
}

interface SummariesResponse {
  response?: { players?: PlayerSummary[] };
}

interface OwnedGamesResponse {
  response?: { game_count?: number; games?: OwnedGame[] };
}

interface AchievementsResponse {
  playerstats?: {
    success?: boolean;
    achievements?: Array<{ achieved?: number }>;
  };
}

/** Build a Steam Web API URL; the key and SteamID travel as query params and are never logged. */
function apiUrl(path: string, params: Record<string, string>): string {
  return `${API_BASE}${path}?${new URLSearchParams(params).toString()}`;
}

/** Round to two decimals (account age). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Read one field from Steam's key:value `check_authentication` response body. */
function openIdField(body: string, key: string): string | undefined {
  for (const line of body.split('\n')) {
    const idx = line.indexOf(':');
    if (idx !== -1 && line.slice(0, idx).trim() === key) return line.slice(idx + 1).trim();
  }
  return undefined;
}

/**
 * Verify the OpenID 2.0 assertion by echoing the signed parameters back to Steam with
 * `openid.mode=check_authentication`. The response is key:value text (not JSON), so this does a raw
 * request and maps failures onto the closed AdapterError set.
 */
async function verifyOpenIdAssertion(params: Record<string, string>): Promise<boolean> {
  const form = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith('openid.')) form.set(key, value);
  }
  form.set('openid.mode', 'check_authentication');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENID_TIMEOUT_MS);
  let body: string;
  try {
    const res = await fetch(OPENID_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
      signal: controller.signal,
    });
    if (!res.ok) {
      if (res.status === 429) throw new AdapterError('rate_limited', 'OpenID verification rate limited');
      if (res.status >= 500) throw new AdapterError('provider_down', `OpenID endpoint ${res.status}`);
      throw new AdapterError('unexpected_response', `OpenID endpoint ${res.status}`);
    }
    body = await res.text();
  } catch (error) {
    if (error instanceof AdapterError) throw error;
    throw new AdapterError('provider_down', `OpenID verification failed: ${(error as Error).message}`);
  } finally {
    clearTimeout(timer);
  }
  return openIdField(body, 'is_valid') === 'true';
}

async function fetchSummary(key: string, steamId: string): Promise<PlayerSummary | undefined> {
  const url = apiUrl('/ISteamUser/GetPlayerSummaries/v2/', { key, steamids: steamId });
  const data = await httpJson<SummariesResponse>(url);
  return data.response?.players?.[0];
}

async function fetchOwnedGames(
  key: string,
  steamId: string,
): Promise<{ games: OwnedGame[]; gameCount?: number }> {
  const url = apiUrl('/IPlayerService/GetOwnedGames/v1/', {
    key,
    steamid: steamId,
    include_appinfo: '1',
    include_played_free_games: '1',
  });
  const data = await httpJson<OwnedGamesResponse>(url);
  const resp = data.response ?? {};
  return { games: resp.games ?? [], gameCount: resp.game_count };
}

/** Per-game completion % (achieved / total * 100), or null when it cannot be read for this game. */
async function fetchGameAchievementPct(
  key: string,
  steamId: string,
  appid: number,
): Promise<number | null> {
  const url = apiUrl('/ISteamUserStats/GetPlayerAchievements/v1/', {
    key,
    steamid: steamId,
    appid: String(appid),
  });
  let data: AchievementsResponse;
  try {
    data = await httpJson<AchievementsResponse>(url);
  } catch (error) {
    // A game with no stats (400) or hidden game-stats (403) is skipped; a transient upstream
    // failure or rate limit must stop the whole sync so the core can back off and retry.
    if (error instanceof AdapterError && (error.code === 'rate_limited' || error.code === 'provider_down')) {
      throw error;
    }
    return null;
  }
  const stats = data.playerstats;
  if (!stats?.success || !stats.achievements?.length) return null;
  const total = stats.achievements.length;
  const achieved = stats.achievements.filter((a) => a.achieved === 1).length;
  return (achieved / total) * 100;
}

/** Mean completion % over the most-played games that expose achievements, or null if none do. */
async function fetchAchievementsPct(
  key: string,
  steamId: string,
  games: OwnedGame[],
): Promise<number | null> {
  const top = [...games]
    .filter((g) => (g.playtime_forever ?? 0) > 0)
    .sort((a, b) => (b.playtime_forever ?? 0) - (a.playtime_forever ?? 0))
    .slice(0, TOP_GAMES_FOR_ACHIEVEMENTS);

  let sum = 0;
  let counted = 0;
  for (const g of top) {
    const pct = await fetchGameAchievementPct(key, steamId, g.appid);
    if (pct !== null) {
      sum += pct;
      counted += 1;
    }
  }
  return counted === 0 ? null : Math.round(sum / counted);
}

/**
 * Steam adapter. OpenID login proves the SteamID64 (no user token); metrics are read with the
 * application's Web API key injected via config. An unconfigured adapter refuses to begin so the
 * registry can fall back to the stub.
 */
export function createSteamAdapter(cfg: SteamConfig): ProviderAdapter {
  const key = cfg.webApiKey;
  const configured = Boolean(key);

  return {
    id: 'steam',
    auth: 'openid',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!configured) throw new AdapterError('provider_down', 'steam is not configured');
      // Carry the anti-forgery state back on the return URL; the realm is the callback's origin.
      const returnTo = new URL(ctx.redirectUri);
      returnTo.searchParams.set('state', ctx.state);
      const params = new URLSearchParams({
        'openid.ns': OPENID_NS,
        'openid.mode': 'checkid_setup',
        'openid.return_to': returnTo.toString(),
        'openid.realm': returnTo.origin,
        'openid.identity': IDENTIFIER_SELECT,
        'openid.claimed_id': IDENTIFIER_SELECT,
      });
      return { redirectUrl: `${OPENID_ENDPOINT}?${params.toString()}` };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      if (ctx.params['openid.mode'] !== 'id_res') {
        // The user cancelled, or Steam returned an error rather than an assertion.
        throw new AdapterError('unexpected_response', 'Steam OpenID assertion was not returned');
      }
      const claimedId = ctx.params['openid.claimed_id'] ?? ctx.params['openid.identity'];
      const steamId = claimedId ? CLAIMED_ID_RE.exec(claimedId)?.[1] : undefined;
      if (!steamId) throw new AdapterError('unexpected_response', 'Steam identity is missing or malformed');

      const valid = await verifyOpenIdAssertion(ctx.params);
      if (!valid) throw new AdapterError('unexpected_response', 'Steam OpenID assertion failed verification');

      // The SteamID64 is the external id (one account = one pass); no tokens for Steam.
      return { externalId: steamId };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!configured) throw new AdapterError('provider_down', 'steam is not configured');
      const steamId = ctx.externalId;

      const summary = await fetchSummary(key, steamId);
      const { games, gameCount } = await fetchOwnedGames(key, steamId);

      // Public profile with no visible games => game-details privacy is on.
      if (games.length === 0 || gameCount === 0) {
        throw new AdapterError('private_data', 'Steam game details are private');
      }

      let totalMinutes = 0;
      let twoWeekMinutes = 0;
      let topGame: OwnedGame | undefined;
      for (const g of games) {
        const forever = g.playtime_forever ?? 0;
        totalMinutes += forever;
        twoWeekMinutes += g.playtime_2weeks ?? 0;
        if (!topGame || forever > (topGame.playtime_forever ?? 0)) topGame = g;
      }

      const achievementsPct = await fetchAchievementsPct(key, steamId, games);
      const accountAgeYears =
        summary?.timecreated && summary.timecreated > 0
          ? round2((Date.now() / 1000 - summary.timecreated) / SECONDS_PER_YEAR)
          : null;

      const metrics: Record<string, number | null> = {
        'steam.hours_total': Math.round(totalMinutes / MINUTES_PER_HOUR),
        'steam.games_count': gameCount ?? games.length,
        'steam.hours_2w': Math.round(twoWeekMinutes / MINUTES_PER_HOUR),
        'steam.achievements_pct': achievementsPct,
        'steam.account_age_years': accountAgeYears,
      };

      const extras: Record<string, unknown> = {};
      if (topGame?.name) extras.topGame = topGame.name;
      return { metrics, extras };
    },
  };
}
