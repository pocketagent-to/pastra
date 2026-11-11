import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { BeginContext, BeginResult, FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * Lichess adapter (OAuth 2.0 with PKCE, public client). The generic OAuth2 adapter handles the
 * token exchange, `identify` and `fetchMetrics`; this file supplies the Lichess endpoints, the
 * (empty) scope set, and reads the account.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `lichess.games`       volume   total games played (`count.all` from /api/account)
 *   - `lichess.games_30d`   activity delta_30d of `lichess.games` (core derives the delta from our
 *                                    own snapshots; we return the cumulative value it is a delta of)
 *   - `lichess.best_rating` depth    highest current rating across the user's game perfs
 *
 * Lichess OAuth2 is a PUBLIC client: PKCE is mandatory and there is NO client secret, and no app
 * registration is required — the `client_id` is a string the app chooses (conventionally its URL).
 * The consent screen reads games played, recent games and best rating, and never the user's email
 * or messages, so we request NO scopes (public account/perf data is readable with any token, and
 * reading email would require `email:read`, which we never ask for).
 */

const AUTHORIZE_URL = 'https://lichess.org/oauth';
const TOKEN_URL = 'https://lichess.org/api/token';
const ACCOUNT_URL = 'https://lichess.org/api/account';

/** No scopes: the authenticated account, its game counts and perf ratings need none. */
const SCOPES: string[] = [];

/** Perf keys in /api/account that are not chess games (their ratings must not count as skill). */
const NON_GAME_PERFS = new Set(['puzzle', 'storm', 'racer', 'streak']);

export interface LichessAdapterConfig {
  /** Lichess OAuth public client id (no secret — PKCE public client). */
  clientId: string;
}

interface LichessPerf {
  games?: number;
  rating?: number;
  prov?: boolean;
}

interface LichessAccount {
  /** Stable lowercase account id (also the username); used as the one-account-one-pass external id. */
  id?: string;
  count?: { all?: number } & Record<string, number | undefined>;
  perfs?: Record<string, LichessPerf>;
}

/** The highest current rating across the formats the user has actually played, or null. */
function bestGameRating(perfs: LichessAccount['perfs']): number | null {
  if (!perfs) return null;
  let best: number | null = null;
  for (const [key, perf] of Object.entries(perfs)) {
    if (NON_GAME_PERFS.has(key)) continue;
    if (!perf || typeof perf.rating !== 'number') continue;
    // Only count a format the user has really played; an unplayed perf carries a default rating.
    if (typeof perf.games !== 'number' || perf.games <= 0) continue;
    if (best === null || perf.rating > best) best = perf.rating;
  }
  return best;
}

async function readAccount(token: string): Promise<LichessAccount> {
  return httpJson<LichessAccount>(ACCOUNT_URL, { headers: bearer(token) });
}

export function createLichessAdapter(cfg: LichessAdapterConfig): ProviderAdapter {
  const { clientId } = cfg;

  async function identify(tokens: Tokens): Promise<string> {
    const me = await readAccount(tokens.access);
    if (!me.id) throw new AdapterError('unexpected_response', 'Lichess returned no account');
    return me.id;
  }

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const me = await readAccount(args.tokens.access);
    const games = typeof me.count?.all === 'number' ? me.count.all : null;
    const bestRating = bestGameRating(me.perfs);

    return {
      metrics: {
        'lichess.games': games,
        // delta_30d: return the cumulative value its delta is taken of; core computes the 30d delta.
        'lichess.games_30d': games,
        'lichess.best_rating': bestRating,
      },
    };
  }

  const base = createOAuth2Adapter({
    id: 'lichess',
    clientId,
    // Public PKCE client: no client secret. The token request carries an empty secret.
    clientSecret: '',
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: SCOPES,
    usePkce: true,
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });

  // The generic adapter treats an empty client_secret as "unconfigured" and refuses to begin, but a
  // Lichess public client is fully configured with only a client id. Provide begin() here (the
  // same authorize-URL construction, PKCE S256); complete/refresh/fetch — the token exchange with
  // an empty secret, identify and metrics — are handled by the generic adapter above.
  return {
    ...base,
    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!clientId) throw new AdapterError('provider_down', 'lichess is not configured');
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: ctx.redirectUri,
        response_type: 'code',
        state: ctx.state,
      });
      if (SCOPES.length > 0) params.set('scope', SCOPES.join(' '));
      if (ctx.codeChallenge) {
        params.set('code_challenge', ctx.codeChallenge);
        params.set('code_challenge_method', 'S256');
      }
      return { redirectUrl: `${AUTHORIZE_URL}?${params.toString()}` };
    },
  };
}
