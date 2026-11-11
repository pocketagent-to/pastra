import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * TIDAL adapter — OAuth 2.0 (authorization-code, confidential client). The generic OAuth2 adapter
 * handles begin/complete/refresh; this file supplies the TIDAL endpoints, scopes, `identify` and
 * `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `tidal.tracks`            volume   number of tracks in the user's collection ("Tracks in collection")
 *   - `tidal.tracks_gain_30d`   activity delta_30d of `tidal.tracks`; we return the cumulative track
 *                                        count and core derives the 30-day delta from our snapshots
 *   - `tidal.artists`           depth    number of artists in the user's collection ("Artists")
 *
 * Privacy (docs/architecture.md section 7; catalog `consent`): we read only the SIZE of the user's
 * collection of tracks and artists. We request `user.read` (to resolve the account id) and
 * `collection.read` (to list the collection) and nothing else — never listening history, playback,
 * or payment/entitlement data (the consent "weNever" list).
 *
 * The collection endpoints are JSON:API (`application/vnd.api+json`) relationship resources keyed by
 * the user id. They return resource-identifier pages without amounts or names; we count the entries
 * across pages (preferring a JSON:API `meta.total` when the API supplies one). A collection id equals
 * the user id, so `externalId` (the account id from `identify`) is the collection id.
 */

const AUTHORIZE_URL = 'https://login.tidal.com/authorize';
const TOKEN_URL = 'https://auth.tidal.com/v1/oauth2/token';

/** The public TIDAL JSON:API base; overridable via config if TIDAL moves the host. */
const DEFAULT_API_BASE = 'https://openapi.tidal.com/v2';

/** JSON:API media type TIDAL's v2 endpoints speak. */
const JSON_API_ACCEPT = 'application/vnd.api+json';

/**
 * Only the scopes we need: resolve the account id and read the collection size. We never request
 * `playback`, `playlists.*`, `entitlements.read`, or any write scope.
 */
const SCOPES = ['user.read', 'collection.read'] as const;

/**
 * Hard runaway guard on the pagination loop (not a business value): bounds how many collection
 * pages we will walk before returning what we have counted so far.
 */
const MAX_PAGES = 500;

export interface TidalAdapterConfig {
  clientId: string;
  clientSecret: string;
  /** Override the JSON:API base URL (default `https://openapi.tidal.com/v2`). No trailing slash needed. */
  apiBaseUrl?: string;
  /** Optional ISO 3166-1 country code, sent to collection endpoints only if your app requires it. */
  countryCode?: string;
  /** Optional BCP-47 locale, sent to collection endpoints only if your app requires it. */
  locale?: string;
}

/** A JSON:API single-resource response (e.g. `/users/me`). */
interface JsonApiResourceResponse {
  data?: { id?: string; type?: string };
}

/** A JSON:API resource-identifier object in a to-many relationship page. */
interface JsonApiResourceId {
  type?: string;
  id?: string;
}

/** A JSON:API to-many relationship page (collection tracks / artists). */
interface JsonApiRelationshipPage {
  data?: JsonApiResourceId[];
  links?: { self?: string; next?: string | null };
  meta?: { total?: number };
}

/** Resolve a JSON:API `links.next` value (absolute URL, origin-relative, or base-relative) to a URL. */
function resolveNext(base: string, next: string): string {
  if (/^https?:\/\//i.test(next)) return next;
  const origin = new URL(base).origin;
  if (next.startsWith('/')) return `${origin}${next}`;
  return `${base}/${next}`;
}

export function createTidalAdapter(cfg: TidalAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;
  const apiBase = (cfg.apiBaseUrl ?? DEFAULT_API_BASE).replace(/\/+$/, '');

  /** The first page URL for a collection relationship, with optional region params if configured. */
  function initialUrl(userId: string, relationship: 'tracks' | 'artists'): string {
    const url = new URL(
      `${apiBase}/userCollections/${encodeURIComponent(userId)}/relationships/${relationship}`,
    );
    if (cfg.countryCode) url.searchParams.set('countryCode', cfg.countryCode);
    if (cfg.locale) url.searchParams.set('locale', cfg.locale);
    return url.toString();
  }

  /** Resolve the connected account id. Used once at connect time, never as a metric. */
  async function identify(tokens: Tokens): Promise<string> {
    const res = await httpJson<JsonApiResourceResponse>(`${apiBase}/users/me`, {
      headers: bearer(tokens.access, { accept: JSON_API_ACCEPT }),
    });
    const id = res.data?.id;
    if (!id) throw new AdapterError('unexpected_response', 'TIDAL returned no user');
    return id;
  }

  /**
   * Count the entries in one collection relationship. Uses a JSON:API `meta.total` when present,
   * otherwise walks the cursor pages and sums the resource-identifier counts. Returns null if the
   * first page is missing the expected `data` array and no total is given.
   */
  async function countRelationship(
    userId: string,
    relationship: 'tracks' | 'artists',
    headers: Record<string, string>,
  ): Promise<number | null> {
    let url = initialUrl(userId, relationship);
    let count = 0;

    for (let page = 0; page < MAX_PAGES; page += 1) {
      const res = await httpJson<JsonApiRelationshipPage>(url, { headers });

      if (page === 0 && typeof res.meta?.total === 'number') return res.meta.total;

      if (!Array.isArray(res.data)) {
        if (page === 0)
          throw new AdapterError('unexpected_response', 'TIDAL returned no collection');
        break;
      }

      count += res.data.length;

      const next = res.links?.next;
      if (!next) return count;
      url = resolveNext(apiBase, next);
    }

    return count;
  }

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const headers = bearer(args.tokens.access, { accept: JSON_API_ACCEPT });
    // externalId is the account id resolved by `identify`, which is also the collection id.
    const tracks = await countRelationship(args.externalId, 'tracks', headers);
    const artists = await countRelationship(args.externalId, 'artists', headers);

    return {
      metrics: {
        'tidal.tracks': tracks,
        // delta_30d: return the cumulative track count; core derives the 30-day delta from snapshots.
        'tidal.tracks_gain_30d': tracks,
        'tidal.artists': artists,
      },
    };
  }

  return createOAuth2Adapter({
    id: 'tidal',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // TIDAL's token endpoint uses HTTP Basic client authentication (client_secret_basic).
    clientAuth: 'basic',
    identify,
    fetchMetrics,
  });
}
