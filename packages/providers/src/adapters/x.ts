import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * X (Twitter) adapter — OAuth 2.0 User Context with PKCE, confidential client. The generic OAuth2
 * adapter handles begin/complete/refresh; this file supplies the X endpoints, scopes, `identify`
 * and `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `x.followers`          volume   `public_metrics.followers_count` (label "Followers")
 *   - `x.posts_gain_30d`     activity delta_30d of the cumulative `x.posts` (= `tweet_count`);
 *                                     we return the cumulative value, core derives the 30d delta
 *   - `x.account_age_years`  depth    account age from the user's `created_at`
 *
 * Cost & privacy (docs/architecture.md section 7, line "X"): exactly ONE paid profile request per
 * sync and we never read the timeline. `syncEveryNthDrop` is 4 and `scoreCap` is 80 in the catalog;
 * both are scoring/scheduling concerns handled by core — this adapter only returns raw counts.
 *
 * The consent screen reads "Follower count, Post count, Account age" and never the timeline, DMs,
 * or posting. We request only `users.read` (profile + public_metrics), `tweet.read` (required
 * alongside users.read by the API) and `offline.access` (to receive a refresh token). We never
 * request write, DM, or timeline-read scopes.
 */

const AUTHORIZE_URL = 'https://twitter.com/i/oauth2/authorize';
const TOKEN_URL = 'https://api.twitter.com/2/oauth2/token';
const USERS_ME_URL = 'https://api.twitter.com/2/users/me';

/** Only the scopes we actually need. `offline.access` yields the refresh token. */
const SCOPES = ['users.read', 'tweet.read', 'offline.access'] as const;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export interface XAdapterConfig {
  clientId: string;
  clientSecret: string;
}

interface XPublicMetrics {
  followers_count?: number;
  following_count?: number;
  tweet_count?: number;
  listed_count?: number;
}

interface XUser {
  id?: string;
  created_at?: string;
  public_metrics?: XPublicMetrics;
}

interface XUserResponse {
  data?: XUser;
}

/** Fractional years since an RFC3339 timestamp, or null if the timestamp is unusable. */
function yearsSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const created = Date.parse(iso);
  if (Number.isNaN(created)) return null;
  const elapsed = Date.now() - created;
  return elapsed > 0 ? elapsed / MS_PER_YEAR : 0;
}

/** A field from public_metrics, or null when the API omitted it. */
function metric(value: number | undefined): number | null {
  return typeof value === 'number' ? value : null;
}

export function createXAdapter(cfg: XAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  /** Resolve the connected account id. Used once at connect time, never as a metric. */
  async function identify(tokens: Tokens): Promise<string> {
    const res = await httpJson<XUserResponse>(USERS_ME_URL, {
      headers: bearer(tokens.access),
    });
    const id = res.data?.id;
    if (!id) throw new AdapterError('unexpected_response', 'X returned no user');
    return id;
  }

  /** ONE paid profile request per sync: profile metrics plus created_at. The timeline is never read. */
  async function fetchMetrics(args: { tokens: Tokens }): Promise<FetchResult> {
    const query = new URLSearchParams({ 'user.fields': 'public_metrics,created_at' });
    const res = await httpJson<XUserResponse>(`${USERS_ME_URL}?${query.toString()}`, {
      headers: bearer(args.tokens.access),
    });
    const user = res.data;
    if (!user) throw new AdapterError('unexpected_response', 'X returned no user');

    const pm = user.public_metrics;
    return {
      metrics: {
        'x.followers': metric(pm?.followers_count),
        // delta_30d: return the cumulative post count; core computes the 30d delta from snapshots.
        'x.posts_gain_30d': metric(pm?.tweet_count),
        'x.account_age_years': yearsSince(user.created_at),
      },
    };
  }

  return createOAuth2Adapter({
    id: 'x',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // X mandates PKCE (S256) on the authorization-code flow.
    usePkce: true,
    // Confidential client: client_id/secret go in the Authorization header (client_secret_basic).
    clientAuth: 'basic',
    identify,
    fetchMetrics,
  });
}
