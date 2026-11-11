import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * LinkedIn adapter — OAuth 2.0 authorization-code with OpenID Connect (confidential client). The
 * generic OAuth2 adapter handles begin/complete/refresh; this file supplies the LinkedIn endpoints,
 * the OIDC scopes, `identify` and `fetchMetrics`.
 *
 * Catalog entry (packages/catalog/src/providers.ts): LinkedIn has NO metrics (`metrics: []`). Open,
 * generally-available access returns only the member's identity (name, headline, photo), so the
 * catalog grants a fixed `axisBonus: +5` to the Social axis for connecting a real LinkedIn account
 * rather than scoring any count. `fetchMetrics` therefore returns an empty metrics object and makes
 * NO data request: there is nothing in the standard scopes we are allowed to turn into a number, and
 * the consent screen promises we never read connections, work history, or messages.
 *
 * Data-access reality (flagged to the owner): connection counts, post/impression statistics and the
 * organic-share API all require LinkedIn Partner Program products (e.g. "Share on LinkedIn",
 * "Marketing Developer Platform", "Community Management API") that are NOT granted to a default app.
 * With only the broadly-available scopes (`openid profile email`) there are no countable member
 * metrics, which is exactly why the catalog scores LinkedIn as a flat bonus. If/when Partner access
 * is approved, new metrics would be added to the catalog first and read here.
 *
 * Identity: `complete` resolves the stable member id from the OIDC `sub` claim via the userinfo
 * endpoint; `sub` is the externalId (one account = one pass) and is never returned as a metric. We
 * never return or log the member's name, email, or photo.
 *
 * Tokens: LinkedIn issues a long-lived (~60-day) access token. Refresh tokens are only granted to
 * approved programs, so most apps receive none — once the access token expires `refresh` throws
 * `auth_expired` (the generic adapter handles the missing refresh token) and core routes the user to
 * reconnect. No `revoke` endpoint is used.
 */

const AUTHORIZE_URL = 'https://www.linkedin.com/oauth/v2/authorization';
const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

/**
 * Only the broadly-available OpenID Connect scopes. `openid` yields the `sub` member id, `profile`
 * the name/headline/photo shown on the consent screen, `email` the verified-email claim. We request
 * no `w_member_social`, `r_organization_*`, or any Partner-only scope.
 */
const SCOPES = ['openid', 'profile', 'email'] as const;

export interface LinkedinAdapterConfig {
  clientId: string;
  clientSecret: string;
}

/** The OpenID Connect userinfo response; we read only the `sub` (stable member id). */
interface LinkedinUserinfo {
  sub?: string;
}

export function createLinkedinAdapter(cfg: LinkedinAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  /** Resolve the connected member id from the OIDC `sub` claim. Used once at connect, never a metric. */
  async function identify(tokens: Tokens): Promise<string> {
    const info = await httpJson<LinkedinUserinfo>(USERINFO_URL, { headers: bearer(tokens.access) });
    if (!info.sub) throw new AdapterError('unexpected_response', 'LinkedIn returned no member id');
    return info.sub;
  }

  /**
   * No metrics: the standard scopes expose nothing we are allowed to count, and LinkedIn scores as a
   * fixed axis bonus (see file header). Returns an empty metrics object and makes no data request, so
   * we never touch connections, posts, or messages.
   */
  async function fetchMetrics(_args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    return { metrics: {} };
  }

  return createOAuth2Adapter({
    id: 'linkedin',
    // OpenID Connect over the standard authorization-code flow.
    auth: 'openid',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // LinkedIn's token endpoint takes client_id/client_secret in the POST body (client_secret_post).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });
}
