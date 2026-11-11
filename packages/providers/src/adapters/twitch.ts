import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * Twitch adapter (OAuth 2.0, Helix API). The generic OAuth2 adapter handles begin/complete/refresh;
 * this file supplies the Twitch endpoints, scopes, `identify` and `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `twitch.subscriptions`      volume   channels the user follows (label "Channels followed")
 *   - `twitch.new_subs_30d`       activity delta_30d of `twitch.subscriptions` (core derives the delta)
 *   - `twitch.account_age_years`  depth    account age from the user's `created_at`
 *
 * The consent screen reads "Channels you follow" and never payment info, so we request
 * `user:read:follows` and read the followed-channel total — never `user:read:subscriptions`
 * (paid subs touch billing). Every Helix request needs a `Client-Id` header beside the Bearer token.
 */

const AUTHORIZE_URL = 'https://id.twitch.tv/oauth2/authorize';
const TOKEN_URL = 'https://id.twitch.tv/oauth2/token';
const USERS_URL = 'https://api.twitch.tv/helix/users';
const FOLLOWED_URL = 'https://api.twitch.tv/helix/channels/followed';

/** Only the scope we actually need: read which channels the user follows. */
const SCOPES = ['user:read:follows'] as const;

const MS_PER_YEAR = 365.25 * 24 * 60 * 60 * 1000;

export interface TwitchAdapterConfig {
  clientId: string;
  clientSecret: string;
}

interface HelixUser {
  id: string;
  created_at: string;
}

interface HelixUsersResponse {
  data?: HelixUser[];
}

interface HelixFollowedResponse {
  /** The number of broadcasters the user follows. */
  total?: number;
}

/** Fractional years since an RFC3339 timestamp, or null if the timestamp is unusable. */
function yearsSince(iso: string | undefined): number | null {
  if (!iso) return null;
  const created = Date.parse(iso);
  if (Number.isNaN(created)) return null;
  const elapsed = Date.now() - created;
  return elapsed > 0 ? elapsed / MS_PER_YEAR : 0;
}

/** Headers every Twitch Helix call requires: Bearer token plus the app Client-Id. */
function helixHeaders(clientId: string, token: string): Record<string, string> {
  return bearer(token, { 'Client-Id': clientId });
}

export function createTwitchAdapter(cfg: TwitchAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  async function identify(tokens: Tokens): Promise<string> {
    const res = await httpJson<HelixUsersResponse>(USERS_URL, {
      headers: helixHeaders(clientId, tokens.access),
    });
    const id = res.data?.[0]?.id;
    if (!id) throw new AdapterError('unexpected_response', 'Twitch returned no user');
    return id;
  }

  async function fetchMetrics(args: { tokens: Tokens; externalId: string }): Promise<FetchResult> {
    const headers = helixHeaders(clientId, args.tokens.access);

    // Account age from the authenticated user's created_at.
    const users = await httpJson<HelixUsersResponse>(USERS_URL, { headers });
    const me = users.data?.[0];
    if (!me) throw new AdapterError('unexpected_response', 'Twitch returned no user');
    const accountAgeYears = yearsSince(me.created_at);

    // Followed-channel total. `channels/followed` only reports the user whose token this is.
    const followedUrl = `${FOLLOWED_URL}?user_id=${encodeURIComponent(args.externalId)}&first=1`;
    const followed = await httpJson<HelixFollowedResponse>(followedUrl, { headers });
    const channelsFollowed = typeof followed.total === 'number' ? followed.total : null;

    return {
      metrics: {
        'twitch.subscriptions': channelsFollowed,
        // delta_30d: return the cumulative value its delta is taken of; core computes the 30d delta.
        'twitch.new_subs_30d': channelsFollowed,
        'twitch.account_age_years': accountAgeYears,
      },
    };
  }

  return createOAuth2Adapter({
    id: 'twitch',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // Twitch's token endpoint takes client_id/client_secret in the body (client_secret_post).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });
}
