import { AdapterError } from '../errors';
import { httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * AniList adapter — OAuth 2.0 (authorization-code, confidential client). The generic OAuth2 adapter
 * handles begin/complete/refresh; this file supplies the AniList endpoints, `identify` and
 * `fetchMetrics`. All data is read from AniList's single GraphQL endpoint.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `anilist.completed`     volume    anime titles with list status COMPLETED ("Titles finished")
 *   - `anilist.episodes_30d`  activity  delta_30d of `anilist.episodes`; we return the CUMULATIVE
 *                                       episodes-watched total and core derives the 30-day delta from
 *                                       our own snapshots
 *   - `anilist.genres`        depth     number of distinct anime genres the user has watched
 *
 * Auth notes (docs/architecture.md section 7, task brief):
 *   - AniList has no OAuth scopes: access is all-or-nothing for the signed-in account, so no `scope`
 *     is requested. Client credentials go in the token-request body (client_secret_post / `clientAuth: 'body'`).
 *   - AniList issues a long-lived access token plus a refresh token; the generic adapter refreshes
 *     via the refresh_token grant when the token is near expiry.
 *
 * Privacy (docs/architecture.md section 14; catalog `consent`): we read the user's own aggregate
 * statistics only — completed-title counts, total episodes watched, and the set of genres. We never
 * read the user's private lists, messages, scores, or any title-level detail, and nothing is logged
 * (the externalId is the numeric account id, used once for one-account-one-pass, never a metric).
 */

const AUTHORIZE_URL = 'https://anilist.co/api/v2/oauth/authorize';
const TOKEN_URL = 'https://anilist.co/api/v2/oauth/token';
const GRAPHQL_URL = 'https://graphql.anilist.co';

/** AniList has no scope system; the authorize endpoint grants full access to the signed-in account. */
const SCOPES: string[] = [];

/** AniList's MediaListStatus value for a finished title. */
const COMPLETED_STATUS = 'COMPLETED';

/** Generous cap on the genres list so no server-side default can truncate it (AniList has ~19 genres). */
const GENRES_LIMIT = 50;

export interface AniListAdapterConfig {
  clientId: string;
  clientSecret: string;
}

interface StatusStat {
  status?: string | null;
  count?: number | null;
}

interface GenreStat {
  genre?: string | null;
}

interface AnimeStatistics {
  episodesWatched?: number | null;
  statuses?: Array<StatusStat | null> | null;
  genres?: Array<GenreStat | null> | null;
}

interface ViewerStatistics {
  anime?: AnimeStatistics | null;
}

interface ViewerNode {
  id?: number | null;
  statistics?: ViewerStatistics | null;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message?: string; status?: number }>;
}

/** Resolve the connected account id (never stored as a metric). */
const VIEWER_ID_QUERY = `query { Viewer { id } }`;

/** The user's own aggregate anime statistics: finished titles, episodes watched, and genres. */
const STATS_QUERY = `
  query {
    Viewer {
      statistics {
        anime {
          episodesWatched
          statuses { status count }
          genres(limit: ${GENRES_LIMIT}) { genre }
        }
      }
    }
  }`;

function graphqlHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
    accept: 'application/json',
    'content-type': 'application/json',
  };
}

/**
 * An AniList GraphQL request. Transport failures are mapped by `httpJson` (401 -> auth_expired,
 * 429 -> rate_limited with Retry-After, 5xx -> provider_down). AniList can also answer HTTP 200 with
 * a query-level `errors` array; those are mapped here to the closed AdapterError set.
 */
async function anilistGraphql<T>(token: string, query: string): Promise<T> {
  const res = await httpJson<GraphQLResponse<T>>(GRAPHQL_URL, {
    method: 'POST',
    headers: graphqlHeaders(token),
    body: JSON.stringify({ query }),
  });
  if (res.errors?.length) {
    const status = res.errors.find((e) => typeof e.status === 'number')?.status;
    if (status === 429) throw new AdapterError('rate_limited', 'AniList rate limited');
    if (status === 401 || status === 403) throw new AdapterError('auth_expired', 'AniList rejected the token');
    throw new AdapterError('unexpected_response', res.errors[0]?.message ?? 'AniList GraphQL error');
  }
  if (!res.data) throw new AdapterError('unexpected_response', 'AniList GraphQL returned no data');
  return res.data;
}

/** Count of anime with list status COMPLETED. Present-but-no-COMPLETED is a real 0; missing is null. */
function completedCount(stats: AnimeStatistics | null | undefined): number | null {
  const statuses = stats?.statuses;
  if (!Array.isArray(statuses)) return null;
  const bucket = statuses.find((s) => s?.status === COMPLETED_STATUS);
  return typeof bucket?.count === 'number' ? bucket.count : 0;
}

/** Number of distinct anime genres watched. Present-but-empty is a real 0; missing is null. */
function genreCount(stats: AnimeStatistics | null | undefined): number | null {
  const genres = stats?.genres;
  if (!Array.isArray(genres)) return null;
  return genres.filter((g) => typeof g?.genre === 'string' && g.genre.length > 0).length;
}

export function createAniListAdapter(cfg: AniListAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  async function identify(tokens: Tokens): Promise<string> {
    const data = await anilistGraphql<{ Viewer?: ViewerNode | null }>(tokens.access, VIEWER_ID_QUERY);
    const id = data.Viewer?.id;
    if (typeof id !== 'number') throw new AdapterError('unexpected_response', 'AniList returned no viewer');
    return String(id);
  }

  async function fetchMetrics(args: { tokens: Tokens }): Promise<FetchResult> {
    const data = await anilistGraphql<{ Viewer?: ViewerNode | null }>(args.tokens.access, STATS_QUERY);
    const viewer = data.Viewer;
    if (!viewer) throw new AdapterError('unexpected_response', 'AniList returned no viewer');

    const anime = viewer.statistics?.anime ?? null;
    const episodes = typeof anime?.episodesWatched === 'number' ? anime.episodesWatched : null;

    return {
      metrics: {
        'anilist.completed': completedCount(anime),
        // delta_30d: return the cumulative episodes-watched total; core derives the 30-day delta.
        'anilist.episodes_30d': episodes,
        'anilist.genres': genreCount(anime),
      },
    };
  }

  return createOAuth2Adapter({
    id: 'anilist',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: SCOPES,
    // AniList's token endpoint takes client_id/client_secret in the request body (client_secret_post).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });
}
