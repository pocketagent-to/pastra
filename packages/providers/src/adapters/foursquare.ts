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
  Tokens,
} from '../types';

/**
 * Foursquare / Swarm adapter — OAuth 2.0 (authorization-code), but with Foursquare's own non-standard
 * shape, so it does NOT use the generic `createOAuth2Adapter` (docs/architecture.md section 7):
 *
 *   - the token endpoint is a GET with `client_id`, `client_secret`, `grant_type`, `redirect_uri`
 *     and `code` in the query string (not a POST form), and returns a bare `{ access_token }`
 *     with no envelope, no `expires_in` and no refresh token (tokens are long-lived);
 *   - every API call is authenticated with an `oauth_token=<token>` query param (not a Bearer header)
 *     and must carry the versioned-responses date `v=YYYYMMDD`;
 *   - responses are wrapped in a `{ meta, response }` envelope.
 *
 * Because none of that fits the generic POST-form / Bearer adapter, this is a custom ProviderAdapter
 * modelled on `steam.ts`. There is no `refresh` (Foursquare tokens do not expire).
 *
 * Catalog metrics (packages/catalog/src/providers.ts), all `source: 'api'` (returned as the real
 * current value — none is a `delta_30d`):
 *   - `foursquare.checkins_total`    volume    lifetime check-in count
 *   - `foursquare.unique_places`     volume    number of distinct venues ever visited
 *   - `foursquare.checkins_30d`      activity  check-ins in the last 30 days
 *   - `foursquare.countries`         depth     number of distinct countries visited
 *   - `foursquare.place_categories`  depth     number of distinct venue categories visited
 *
 * Privacy (catalog `consent`, docs/architecture.md section 14): we read only counts. We never return
 * or log coordinates, place names or visit times. Country codes and category ids from the venue
 * history are collapsed into distinct-set counts and discarded. The externalId is the Foursquare user
 * id (one account = one pass), returned from `complete`, never a metric and never logged.
 *
 * NOTE: personal Swarm check-in / venue-history access is gated by Foursquare today — an app that has
 * not been granted that permission gets 403 on `/users/self/checkins` and `/users/self/venuehistory`.
 * Those calls are therefore "soft": a private/unexpected failure degrades the affected metrics to
 * `null` (the pass still gets the lifetime check-in count from the profile) instead of failing the
 * whole sync, while auth/rate/outage errors still propagate so core can react.
 */

const AUTHENTICATE_URL = 'https://foursquare.com/oauth2/authenticate';
const TOKEN_URL = 'https://foursquare.com/oauth2/access_token';
const API_BASE = 'https://api.foursquare.com/v2';

/** Foursquare versioned-responses date (`v=YYYYMMDD`): pins the response schema this adapter targets. */
const API_VERSION = '20250101';

const SECONDS_PER_DAY = 24 * 60 * 60;
const THIRTY_DAYS_SECONDS = 30 * SECONDS_PER_DAY;

export interface FoursquareAdapterConfig {
  /** Foursquare app Client ID (env FOURSQUARE_CLIENT_ID). */
  clientId: string;
  /** Foursquare app Client Secret (env FOURSQUARE_CLIENT_SECRET). */
  clientSecret: string;
}

/** Bare token response from GET /oauth2/access_token (no envelope, no expiry, no refresh). */
interface TokenResponse {
  access_token?: string;
}

interface Envelope<T> {
  meta?: { code?: number; errorType?: string; errorDetail?: string };
  response?: T;
}

interface SelfResponse {
  user?: {
    id?: string;
    checkins?: { count?: number };
  };
}

interface CheckinsResponse {
  checkins?: { count?: number };
}

interface VenueCategory {
  id?: string;
  name?: string;
  primary?: boolean;
}

interface VenueHistoryVenue {
  location?: { cc?: string };
  categories?: VenueCategory[];
}

interface VenueHistoryResponse {
  venues?: {
    count?: number;
    items?: Array<{ venue?: VenueHistoryVenue }>;
  };
}

/** Build a Foursquare v2 API URL. The token and ids travel as query params and are never logged. */
function apiUrl(path: string, token: string, params: Record<string, string> = {}): string {
  const qs = new URLSearchParams({ oauth_token: token, v: API_VERSION, ...params });
  return `${API_BASE}${path}?${qs.toString()}`;
}

/** Map a Foursquare envelope `meta.code` (set even on some HTTP-200 errors) to the closed error set. */
function metaError(code: number): AdapterError {
  if (code === 401) return new AdapterError('auth_expired', 'Foursquare rejected the token');
  if (code === 403) return new AdapterError('private_data', 'Foursquare data is not accessible');
  if (code === 429) return new AdapterError('rate_limited', 'Foursquare rate limited');
  if (code >= 500) return new AdapterError('provider_down', `Foursquare ${code}`);
  return new AdapterError('unexpected_response', `Foursquare meta code ${code}`);
}

/**
 * A Foursquare v2 GET. `httpJson` maps HTTP-level failures (401 -> auth_expired, 429 -> rate_limited
 * with Retry-After, 5xx -> provider_down); this additionally honours an envelope-level `meta.code`.
 */
async function fsqGet<T>(url: string): Promise<T> {
  const data = await httpJson<Envelope<T>>(url);
  const code = data.meta?.code;
  if (typeof code === 'number' && code >= 400) throw metaError(code);
  if (!data.response)
    throw new AdapterError('unexpected_response', 'Foursquare returned no response');
  return data.response;
}

/**
 * Run an optional (permission-gated) sub-fetch. Auth/rate/outage errors propagate so core can react;
 * a private-data or unexpected failure means the endpoint is not reachable for this app -> `null`.
 */
async function softFetch<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (
      error instanceof AdapterError &&
      (error.code === 'auth_expired' ||
        error.code === 'rate_limited' ||
        error.code === 'provider_down')
    ) {
      throw error;
    }
    return null;
  }
}

/** Resolve the connected Foursquare user id (used once at connect time, never a metric). */
async function identify(token: string): Promise<string> {
  const res = await fsqGet<SelfResponse>(apiUrl('/users/self', token));
  const id = res.user?.id;
  if (!id) throw new AdapterError('unexpected_response', 'Foursquare returned no user');
  return id;
}

/** Lifetime check-in count from the profile, or null when the field is absent. */
function totalCheckins(res: SelfResponse): number | null {
  const count = res.user?.checkins?.count;
  return typeof count === 'number' ? count : null;
}

/** Check-ins after a unix timestamp (`afterTimestamp`); `limit=1` keeps the payload to the count. */
async function recentCheckins(token: string, afterTimestamp: number): Promise<number | null> {
  const res = await fsqGet<CheckinsResponse>(
    apiUrl('/users/self/checkins', token, { afterTimestamp: String(afterTimestamp), limit: '1' }),
  );
  const count = res.checkins?.count;
  return typeof count === 'number' ? count : null;
}

/** The primary (or first) category id of a venue, for the distinct-category count. */
function primaryCategoryId(categories: VenueCategory[] | undefined): string | undefined {
  if (!Array.isArray(categories) || categories.length === 0) return undefined;
  const chosen = categories.find((c) => c?.primary) ?? categories[0];
  if (typeof chosen?.id === 'string' && chosen.id.length > 0) return chosen.id;
  return typeof chosen?.name === 'string' && chosen.name.length > 0 ? chosen.name : undefined;
}

/** Unique venues / distinct countries / distinct categories from the user's venue history. */
async function venueBreadth(
  token: string,
): Promise<{ uniquePlaces: number; countries: number; categories: number }> {
  const res = await fsqGet<VenueHistoryResponse>(apiUrl('/users/self/venuehistory', token));
  const items = Array.isArray(res.venues?.items) ? res.venues.items : [];

  const countries = new Set<string>();
  const categories = new Set<string>();
  for (const item of items) {
    const cc = item.venue?.location?.cc;
    if (typeof cc === 'string' && cc.length > 0) countries.add(cc.toUpperCase());
    const cat = primaryCategoryId(item.venue?.categories);
    if (cat) categories.add(cat);
  }

  const uniquePlaces = typeof res.venues?.count === 'number' ? res.venues.count : items.length;
  return { uniquePlaces, countries: countries.size, categories: categories.size };
}

/**
 * Foursquare adapter. Client credentials come from config; an unconfigured adapter refuses to begin
 * so the registry can fall back to the stub.
 */
export function createFoursquareAdapter(cfg: FoursquareAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;
  const configured = Boolean(clientId && clientSecret);

  return {
    id: 'foursquare',
    auth: 'oauth2',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!configured) throw new AdapterError('provider_down', 'foursquare is not configured');
      // Foursquare OAuth has no scopes; the authorize step grants access to the signed-in account.
      const params = new URLSearchParams({
        client_id: clientId,
        response_type: 'code',
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
      });
      return { redirectUrl: `${AUTHENTICATE_URL}?${params.toString()}` };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const code = ctx.params.code;
      if (!code) throw new AdapterError('unexpected_response', 'Missing authorization code');
      // Foursquare exchanges the code with a GET; client credentials ride in the query string.
      const url = `${TOKEN_URL}?${new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'authorization_code',
        redirect_uri: ctx.redirectUri,
        code,
      }).toString()}`;
      const res = await httpJson<TokenResponse>(url);
      if (!res.access_token)
        throw new AdapterError('unexpected_response', 'No access token returned');
      // Long-lived token, no scopes, no refresh.
      const tokens: Tokens = { access: res.access_token, scopes: [] };
      const externalId = await identify(res.access_token);
      return { externalId, tokens };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!ctx.tokens) throw new AdapterError('auth_expired', 'No tokens for this connection');
      const token = ctx.tokens.access;

      // Profile read is fatal: it is the auth/privacy gate and carries the lifetime check-in count.
      const self = await fsqGet<SelfResponse>(apiUrl('/users/self', token));
      const checkinsTotal = totalCheckins(self);

      // Permission-gated personal check-in data: degrade to null rather than fail the whole sync.
      const since = Math.floor(Date.now() / 1000) - THIRTY_DAYS_SECONDS;
      const checkins30d = await softFetch(() => recentCheckins(token, since));
      const breadth = await softFetch(() => venueBreadth(token));

      const metrics: Record<string, number | null> = {
        'foursquare.checkins_total': checkinsTotal,
        'foursquare.unique_places': breadth ? breadth.uniquePlaces : null,
        'foursquare.checkins_30d': checkins30d,
        'foursquare.countries': breadth ? breadth.countries : null,
        'foursquare.place_categories': breadth ? breadth.categories : null,
      };

      return { metrics };
    },
  };
}
