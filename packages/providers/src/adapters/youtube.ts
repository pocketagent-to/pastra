import { AdapterError, isAdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

/**
 * YouTube adapter (Google OAuth 2.0, YouTube Data API v3). The generic OAuth2 adapter handles
 * begin/complete/refresh; this file supplies the Google endpoints, scope, `identify` and
 * `fetchMetrics`.
 *
 * Catalog metrics (packages/catalog/src/providers.ts):
 *   - `youtube.subscriptions`  volume    channels the user is subscribed to (label "Subscriptions")
 *   - `youtube.likes_30d`      activity  delta_30d of `youtube.likes`; core derives the 30-day delta
 *                                        from our snapshots, so we return the CUMULATIVE liked-video
 *                                        count (or null when the user keeps liked videos private)
 *   - `youtube.playlists`      depth     playlists the user owns (label "Playlists")
 *
 * Privacy (docs/architecture.md section 7, consent screen): we read subscriptions, the liked-video
 * count and playlists; never watch history or comments. The read-only scope is enough for all three.
 * We read counts only (`pageInfo.totalResults`), never video ids, titles or watch data.
 *
 * Auth notes:
 *   - `access_type=offline` + `prompt=consent` on the authorize URL so Google returns a refresh
 *     token (it is issued only on the consenting grant; the generic adapter keeps it across
 *     refreshes, where Google omits a new one).
 *   - Google's token endpoint accepts client credentials in the body (client_secret_post).
 *   - Every Data API read needs OAuth (`mine=true` has no meaning without a user token); no API key.
 */

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const SUBSCRIPTIONS_URL = 'https://www.googleapis.com/youtube/v3/subscriptions';
const PLAYLISTS_URL = 'https://www.googleapis.com/youtube/v3/playlists';
const PLAYLIST_ITEMS_URL = 'https://www.googleapis.com/youtube/v3/playlistItems';

/** Read-only access to the connected user's YouTube account; nothing write, no other Google data. */
const SCOPES = ['https://www.googleapis.com/auth/youtube.readonly'] as const;

export interface YouTubeAdapterConfig {
  clientId: string;
  clientSecret: string;
}

interface YtPageInfo {
  totalResults?: number;
}

interface YtListResponse {
  pageInfo?: YtPageInfo;
}

interface YtChannel {
  id?: string;
  contentDetails?: { relatedPlaylists?: { likes?: string } };
}

interface YtChannelsResponse {
  items?: YtChannel[];
}

/** `pageInfo.totalResults` if the API reported it, otherwise null (never guess a count). */
function totalResults(res: YtListResponse): number | null {
  const total = res.pageInfo?.totalResults;
  return typeof total === 'number' ? total : null;
}

/** A YouTube Data API GET with the user's Bearer token, counting-only (`maxResults=1`). */
async function ytGet<T>(url: string, token: string, params: Record<string, string>): Promise<T> {
  const query = new URLSearchParams(params).toString();
  return httpJson<T>(`${url}?${query}`, { headers: bearer(token) });
}

export function createYouTubeAdapter(cfg: YouTubeAdapterConfig): ProviderAdapter {
  const { clientId, clientSecret } = cfg;

  /** The connected account id is the stable YouTube channel id (never a metric). */
  async function identify(tokens: Tokens): Promise<string> {
    const res = await ytGet<YtChannelsResponse>(CHANNELS_URL, tokens.access, {
      part: 'id',
      mine: 'true',
      maxResults: '1',
    });
    const id = res.items?.[0]?.id;
    if (!id) throw new AdapterError('unexpected_response', 'YouTube returned no channel');
    return id;
  }

  /**
   * The cumulative liked-video count, read from the channel's "likes" playlist. Google returns an
   * empty playlist id when the user keeps their liked videos private; a private/absent playlist
   * likewise means we cannot read the count. Either way the (optional, delta_30d) metric is null —
   * we never fail the whole sync for it, but we do let auth/rate/upstream errors propagate.
   */
  async function likedVideoCount(token: string, likesPlaylistId: string | undefined): Promise<number | null> {
    if (!likesPlaylistId) return null;
    try {
      const res = await ytGet<YtListResponse>(PLAYLIST_ITEMS_URL, token, {
        part: 'id',
        playlistId: likesPlaylistId,
        maxResults: '1',
      });
      return totalResults(res);
    } catch (error) {
      // A forbidden/not-found playlist means the liked videos are private — report null, not failure.
      if (isAdapterError(error) && (error.code === 'private_data' || error.code === 'unexpected_response')) {
        return null;
      }
      throw error;
    }
  }

  async function fetchMetrics(args: { tokens: Tokens }): Promise<FetchResult> {
    const token = args.tokens.access;

    // Channel contentDetails carries the special "likes" playlist id (relatedPlaylists.likes).
    const channel = await ytGet<YtChannelsResponse>(CHANNELS_URL, token, {
      part: 'contentDetails',
      mine: 'true',
      maxResults: '1',
    });
    const me = channel.items?.[0];
    if (!me) throw new AdapterError('unexpected_response', 'YouTube returned no channel');
    const likesPlaylistId = me.contentDetails?.relatedPlaylists?.likes || undefined;

    const subs = await ytGet<YtListResponse>(SUBSCRIPTIONS_URL, token, {
      part: 'id',
      mine: 'true',
      maxResults: '1',
    });
    const playlists = await ytGet<YtListResponse>(PLAYLISTS_URL, token, {
      part: 'id',
      mine: 'true',
      maxResults: '1',
    });
    const likes = await likedVideoCount(token, likesPlaylistId);

    return {
      metrics: {
        'youtube.subscriptions': totalResults(subs),
        // delta_30d: return the cumulative value its delta is taken of; core computes the 30d delta.
        'youtube.likes_30d': likes,
        'youtube.playlists': totalResults(playlists),
      },
    };
  }

  return createOAuth2Adapter({
    id: 'youtube',
    clientId,
    clientSecret,
    authorizeUrl: AUTHORIZE_URL,
    tokenUrl: TOKEN_URL,
    scopes: [...SCOPES],
    // Google issues a refresh token only with access_type=offline and an explicit consent prompt.
    authorizeParams: { access_type: 'offline', prompt: 'consent' },
    // Google's token endpoint takes client_id/client_secret in the body (client_secret_post).
    clientAuth: 'body',
    identify,
    fetchMetrics,
  });
}
