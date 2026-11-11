import { AdapterError, isAdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * Battle.net adapter — Blizzard OAuth 2.0 (authorization-code, confidential client). The generic
 * OAuth2 adapter handles begin/complete/refresh; this file supplies the Blizzard endpoints, scopes,
 * `identify` (the Battle.net account id) and `fetchMetrics` (WoW + StarCraft II reads).
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `battlenet.wow_points`       volume   total World of Warcraft achievement points
 *   - `battlenet.points_gain_30d`  activity delta_30d of `battlenet.wow_points`; we return the
 *                                           CUMULATIVE points and core derives the 30-day delta
 *                                           from our snapshots
 *   - `battlenet.sc2_league`       depth    best StarCraft II 1v1 league rank, 1..7
 *                                           (Bronze=1 .. Grandmaster=7)
 *
 * Auth: client credentials come from config and travel to the token endpoint as HTTP Basic
 * (client_secret_basic). The account id is resolved once from the OpenID `userinfo` endpoint and
 * used as `externalId` (one account = one pass); it is never returned as a metric. We read only
 * aggregate counts and the league tier — never friends, purchases, the battletag or any token is
 * logged (docs/architecture.md section 14, the consent "weNever" list).
 *
 * WoW achievement points are account-wide in modern WoW (shared across every character on the
 * account), so the highest total across the account's top characters is the account total. We read
 * the account's character list, then read achievement totals for the highest-level few and take the
 * max — capped to stay inside the rate limit (like the Steam adapter's top-N achievement scan).
 *
 * StarCraft II: the account's SC2 profiles are listed, then each profile's ladder summary gives the
 * showcase league tier; we take the best tier across the account's profiles.
 */

/** Global Battle.net OAuth host (every region except mainland China uses this). */
const OAUTH_AUTHORIZE_URL = 'https://oauth.battle.net/authorize';
const OAUTH_TOKEN_URL = 'https://oauth.battle.net/token';
const OAUTH_USERINFO_URL = 'https://oauth.battle.net/userinfo';

/** Only the scopes the catalog metrics need: WoW profile (points) and SC2 profile (league). */
const SCOPES = ['openid', 'wow.profile', 'sc2.profile'] as const;

/** Locale for the WoW Profile API (optional, but Blizzard recommends passing one). */
const LOCALE = 'en_US';

/** Achievement points are account-wide; read the top characters by level and take the max. */
const TOP_CHARACTERS_FOR_ACHIEVEMENTS = 5;
/** A Battle.net account has at most a handful of SC2 profiles (one per region/realm). */
const MAX_SC2_PROFILES = 8;

/** StarCraft II league names -> rank 1..7 (matches the catalog's linear t0=1, t100=7 scale). */
const SC2_LEAGUE_BY_NAME: Record<string, number> = {
  BRONZE: 1,
  SILVER: 2,
  GOLD: 3,
  PLATINUM: 4,
  DIAMOND: 5,
  MASTER: 6,
  GRANDMASTER: 7,
};
/** Blizzard's numeric `leagueType` is 0-based Bronze..Grandmaster. */
const SC2_LEAGUE_TYPE_MIN = 0;
const SC2_LEAGUE_TYPE_MAX = 6;

/** The data-API regions Blizzard serves outside mainland China. */
export type BattlenetRegion = 'us' | 'eu' | 'kr' | 'tw';

export interface BattlenetConfig {
  clientId: string;
  clientSecret: string;
  /** Data-API region (host + WoW namespace). Defaults to `us`. */
  region?: BattlenetRegion;
}

interface UserInfo {
  /** OpenID subject: the Battle.net account id as a string. */
  sub?: string;
  /** Legacy numeric account id (same value as `sub`). */
  id?: number;
}

interface WowRealmRef {
  slug?: string;
}
interface WowCharacterRef {
  name?: string;
  level?: number;
  realm?: WowRealmRef;
}
interface WowAccount {
  characters?: WowCharacterRef[];
}
interface WowAccountSummary {
  wow_accounts?: WowAccount[];
}
interface WowAchievementsSummary {
  total_points?: number;
}

interface Sc2PlayerProfile {
  profileId?: string | number;
  regionId?: number;
  realmId?: number;
}
interface Sc2ShowcaseEntry {
  /** 0-based league index (Bronze=0 .. Grandmaster=6). */
  leagueType?: number;
  /** Some ladder shapes carry the league as a name instead. */
  league?: string;
}
interface Sc2LadderSummary {
  showCaseEntries?: Sc2ShowcaseEntry[];
}

/**
 * A fetch failure that must stop the whole sync so core can back off and retry (or ask the user to
 * reconnect). Everything else — a missing character, a profile with no ladder, a 404 for an account
 * without a given game — is non-fatal: that slice is simply absent and its metric stays null.
 */
function isCritical(error: unknown): error is AdapterError {
  return (
    isAdapterError(error) &&
    (error.code === 'rate_limited' ||
      error.code === 'provider_down' ||
      error.code === 'auth_expired')
  );
}

/** A Bearer-authorized JSON GET against the Blizzard APIs. */
function apiGet<T>(url: string, token: string): Promise<T> {
  return httpJson<T>(url, { headers: bearer(token) });
}

/** Resolve the Battle.net account id from the OpenID userinfo endpoint. Never stored as a metric. */
async function identify(tokens: Tokens): Promise<string> {
  const info = await httpJson<UserInfo>(OAUTH_USERINFO_URL, { headers: bearer(tokens.access) });
  const id = info.sub ?? (typeof info.id === 'number' ? String(info.id) : undefined);
  if (!id)
    throw new AdapterError('unexpected_response', 'Battle.net userinfo returned no account id');
  return id;
}

/** Achievement total for one character, or null when it cannot be read for that character. */
async function fetchCharacterPoints(
  host: string,
  namespace: string,
  character: WowCharacterRef,
  token: string,
): Promise<number | null> {
  const realmSlug = character.realm?.slug;
  const name = character.name;
  if (!realmSlug || !name) return null;
  const query = new URLSearchParams({ namespace, locale: LOCALE }).toString();
  const url = `${host}/profile/wow/character/${encodeURIComponent(realmSlug)}/${encodeURIComponent(
    name.toLowerCase(),
  )}/achievements?${query}`;
  try {
    const data = await apiGet<WowAchievementsSummary>(url, token);
    return typeof data.total_points === 'number' ? data.total_points : null;
  } catch (error) {
    if (isCritical(error)) throw error;
    return null;
  }
}

/**
 * Total WoW achievement points for the account (max over the top characters), or null when the
 * account has no readable WoW characters.
 */
async function fetchWowPoints(
  host: string,
  namespace: string,
  token: string,
): Promise<number | null> {
  try {
    const query = new URLSearchParams({ namespace, locale: LOCALE }).toString();
    const summary = await apiGet<WowAccountSummary>(`${host}/profile/user/wow?${query}`, token);

    const characters: WowCharacterRef[] = [];
    for (const account of summary.wow_accounts ?? []) {
      for (const character of account.characters ?? []) characters.push(character);
    }
    if (characters.length === 0) return null;

    const top = [...characters]
      .sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
      .slice(0, TOP_CHARACTERS_FOR_ACHIEVEMENTS);

    let best: number | null = null;
    for (const character of top) {
      const points = await fetchCharacterPoints(host, namespace, character, token);
      if (points !== null && (best === null || points > best)) best = points;
    }
    return best;
  } catch (error) {
    if (isCritical(error)) throw error;
    return null;
  }
}

/** Map a showcase entry to a league rank 1..7, or null when it carries no recognisable league. */
function leagueRank(entry: Sc2ShowcaseEntry): number | null {
  if (
    typeof entry.leagueType === 'number' &&
    entry.leagueType >= SC2_LEAGUE_TYPE_MIN &&
    entry.leagueType <= SC2_LEAGUE_TYPE_MAX
  ) {
    return entry.leagueType + 1;
  }
  if (typeof entry.league === 'string') {
    return SC2_LEAGUE_BY_NAME[entry.league.toUpperCase()] ?? null;
  }
  return null;
}

/** Best league rank across one SC2 profile's showcase entries, or null. */
async function fetchProfileLeague(
  host: string,
  profile: Sc2PlayerProfile,
  token: string,
): Promise<number | null> {
  const { regionId, realmId, profileId } = profile;
  if (regionId == null || realmId == null || profileId == null) return null;
  const url = `${host}/sc2/profile/${regionId}/${realmId}/${encodeURIComponent(
    String(profileId),
  )}/ladder/summary`;
  try {
    const summary = await apiGet<Sc2LadderSummary>(url, token);
    let best: number | null = null;
    for (const entry of summary.showCaseEntries ?? []) {
      const rank = leagueRank(entry);
      if (rank !== null && (best === null || rank > best)) best = rank;
    }
    return best;
  } catch (error) {
    if (isCritical(error)) throw error;
    return null;
  }
}

/** Best StarCraft II league across the account's profiles, or null when there are none. */
async function fetchSc2League(
  host: string,
  token: string,
  accountId: string,
): Promise<number | null> {
  try {
    const profiles = await apiGet<Sc2PlayerProfile[]>(
      `${host}/sc2/player/${encodeURIComponent(accountId)}`,
      token,
    );
    if (!Array.isArray(profiles) || profiles.length === 0) return null;

    let best: number | null = null;
    for (const profile of profiles.slice(0, MAX_SC2_PROFILES)) {
      const rank = await fetchProfileLeague(host, profile, token);
      if (rank !== null && (best === null || rank > best)) best = rank;
    }
    return best;
  } catch (error) {
    if (isCritical(error)) throw error;
    return null;
  }
}

/**
 * Battle.net adapter. Client credentials come from config; an unconfigured adapter refuses to begin
 * (handled by the generic OAuth2 adapter) so the registry can fall back to the stub.
 */
export function createBattlenetAdapter(cfg: BattlenetConfig): ProviderAdapter {
  const region = cfg.region ?? 'us';
  const host = `https://${region}.api.blizzard.com`;
  const namespace = `profile-${region}`;

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const token = args.tokens.access;
    const wowPoints = await fetchWowPoints(host, namespace, token);
    const sc2League = await fetchSc2League(host, token, args.externalId);

    return {
      metrics: {
        'battlenet.wow_points': wowPoints,
        // delta_30d: return the cumulative points; core derives the 30-day delta from snapshots.
        'battlenet.points_gain_30d': wowPoints,
        'battlenet.sc2_league': sc2League,
      },
    };
  }

  return createOAuth2Adapter({
    id: 'battlenet',
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    authorizeUrl: OAUTH_AUTHORIZE_URL,
    tokenUrl: OAUTH_TOKEN_URL,
    scopes: [...SCOPES],
    // Blizzard's token endpoint expects HTTP Basic client auth (client_secret_basic).
    clientAuth: 'basic',
    identify,
    fetchMetrics,
  });
}
