import { createHash } from 'node:crypto';
import { AdapterError } from '../errors';
import { bearer, httpForm, httpJson } from '../http';
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
 * MyAnimeList adapter — OAuth 2.0 (authorization-code, confidential client) over the MAL API v2.
 *
 * This is a CUSTOM adapter rather than `createOAuth2Adapter`, because MAL only supports PKCE with
 * `code_challenge_method = plain` (RFC 7636 §4.2): the `code_verifier` must be sent back verbatim as
 * the `code_challenge`. The generic adapter always advertises `S256`, which MAL rejects, so begin /
 * complete / refresh are implemented here while the HTTP + error mapping helpers are reused.
 *
 * Catalog metrics (packages/catalog/src/providers.ts), all read from `anime_statistics`:
 *   - `myanimelist.completed`     volume    `num_items_completed`  ("Titles finished")
 *   - `myanimelist.episodes_30d`  activity  delta_30d of `myanimelist.episodes`; we return the
 *                                           CUMULATIVE `num_episodes` total and core derives the
 *                                           30-day delta from our own snapshots
 *   - `myanimelist.days_watched`  depth     `num_days_watched`     ("Days watched")
 *
 * `mean_score` and the other `anime_statistics` fields exist but have no catalog metric, so they are
 * deliberately not returned (the adapter must emit exactly the catalog's key set).
 *
 * Privacy (docs/architecture.md §14; catalog `consent`): we read only the signed-in user's aggregate
 * anime statistics — completed-title count, total episodes and total days watched. We never read the
 * user's private lists, scores per title, or messages, and nothing is logged. The externalId is the
 * numeric MAL account id, used once for one-account-one-pass and never stored as a metric.
 */

const AUTHORIZE_URL = 'https://myanimelist.net/v1/oauth2/authorize';
const TOKEN_URL = 'https://myanimelist.net/v1/oauth2/token';
const USER_URL = 'https://api.myanimelist.net/v2/users/@me?fields=anime_statistics';

/** MAL has no granular OAuth scopes; the grant covers the signed-in account's list data. */
const SCOPES: string[] = [];

export interface MyAnimeListAdapterConfig {
  clientId: string;
  clientSecret: string;
}

interface TokenResponse {
  token_type?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
}

/** The subset of MAL's `anime_statistics` we read; every field may be absent on an empty list. */
interface AnimeStatistics {
  num_items_completed?: number;
  num_episodes?: number;
  num_days_watched?: number;
}

interface MalUser {
  id?: number;
  anime_statistics?: AnimeStatistics;
}

/**
 * base64url(sha256(input)) — byte-for-byte identical to the challenge that the server's `pkcePair()`
 * derives from its verifier (packages/providers/src/http.ts). This equivalence is what lets MAL's
 * plain-PKCE flow ride on the central S256 wiring: see `complete` below.
 */
function s256(input: string): string {
  return createHash('sha256')
    .update(input)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function toTokens(res: TokenResponse): Tokens {
  if (!res.access_token)
    throw new AdapterError('unexpected_response', 'MAL returned no access token');
  return {
    access: res.access_token,
    refresh: res.refresh_token,
    expiresAt: res.expires_in ? new Date(Date.now() + res.expires_in * 1000) : undefined,
    scopes: SCOPES,
  };
}

/** A finite number straight through; anything else (absent field, NaN) becomes null. */
function numberOrNull(value: number | undefined): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** Round to one decimal (days watched is a float on MAL). */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function createMyAnimeListAdapter(cfg: MyAnimeListAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;
  const configured = Boolean(clientId && clientSecret);

  /** Exchange a code or refresh token at MAL's token endpoint (client_secret_post). */
  async function exchange(form: Record<string, string>): Promise<Tokens> {
    const res = await httpForm<TokenResponse>(TOKEN_URL, {
      client_id: clientId,
      client_secret: clientSecret,
      ...form,
    });
    return toTokens(res);
  }

  return {
    id: 'myanimelist',
    auth: 'oauth2',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      // Unconfigured adapters refuse to begin so the registry can fall back to the stub.
      if (!configured) throw new AdapterError('provider_down', 'myanimelist is not configured');
      if (!ctx.codeChallenge) {
        throw new AdapterError('unexpected_response', 'myanimelist requires a PKCE challenge');
      }
      // MAL plain PKCE: send the server's challenge value as-is and declare method=plain. At the
      // token step we must echo the SAME value as `code_verifier` (see complete).
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: ctx.redirectUri,
        state: ctx.state,
        code_challenge: ctx.codeChallenge,
        code_challenge_method: 'plain',
      });
      return { redirectUrl: `${AUTHORIZE_URL}?${params.toString()}` };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const code = ctx.params.code;
      if (!code) throw new AdapterError('unexpected_response', 'Missing authorization code');
      const verifier = ctx.params.codeVerifier;
      if (!verifier) throw new AdapterError('unexpected_response', 'Missing PKCE verifier');

      // The server stored an S256 verifier and gave begin its S256 challenge C = base64url(sha256(V)).
      // MAL's plain flow needs `code_verifier === code_challenge`, so we reconstruct C from V here and
      // send it as the verifier; it matches the `code_challenge` begin already sent to MAL.
      const tokens = await exchange({
        grant_type: 'authorization_code',
        code,
        code_verifier: s256(verifier),
        redirect_uri: ctx.redirectUri,
      });

      const user = await httpJson<MalUser>(USER_URL, { headers: bearer(tokens.access) });
      if (typeof user.id !== 'number') {
        throw new AdapterError('unexpected_response', 'MAL returned no account id');
      }
      // The numeric MAL account id is the external id (one account = one pass), never a metric.
      return { externalId: String(user.id), tokens };
    },

    async refresh(tokens: Tokens): Promise<Tokens> {
      if (!tokens.refresh) throw new AdapterError('auth_expired', 'No refresh token');
      const refreshed = await exchange({
        grant_type: 'refresh_token',
        refresh_token: tokens.refresh,
      });
      // MAL rotates refresh tokens; keep the previous one if the response omits a new one.
      return { ...refreshed, refresh: refreshed.refresh ?? tokens.refresh };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!ctx.tokens) throw new AdapterError('auth_expired', 'No tokens for this connection');
      const user = await httpJson<MalUser>(USER_URL, { headers: bearer(ctx.tokens.access) });
      const stats = user.anime_statistics ?? {};

      const days = numberOrNull(stats.num_days_watched);
      return {
        metrics: {
          'myanimelist.completed': numberOrNull(stats.num_items_completed),
          // delta_30d: return the cumulative episodes total; core derives the 30-day delta.
          'myanimelist.episodes_30d': numberOrNull(stats.num_episodes),
          'myanimelist.days_watched': days === null ? null : round1(days),
        },
      };
    },
  };
}
