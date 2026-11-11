import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import { createOAuth2Adapter } from '../oauth2';
import type { FetchResult, ProviderAdapter, Tokens } from '../types';

export interface SpotifyAdapterConfig {
  clientId: string;
  clientSecret: string;
}

const API = 'https://api.spotify.com/v1';
const SCOPES = ['user-library-read', 'user-follow-read'] as const;

interface MeResponse {
  id?: string;
}
interface SavedResponse {
  total?: number;
}
interface FollowingResponse {
  artists?: { total?: number };
}

/**
 * Spotify (Web API, OAuth 2.0). Reads the saved-track library size (+ its 30-day gain, derived by
 * core) and the number of followed artists — counts only, never real-time playback. Spotify does
 * not expose total listening time, so metrics are library/taste based.
 */
export function createSpotifyAdapter(cfg: SpotifyAdapterConfig): ProviderAdapter {
  return createOAuth2Adapter({
    id: 'spotify',
    clientId: cfg.clientId,
    clientSecret: cfg.clientSecret,
    authorizeUrl: 'https://accounts.spotify.com/authorize',
    tokenUrl: 'https://accounts.spotify.com/api/token',
    scopes: [...SCOPES],
    clientAuth: 'basic',

    async identify(tokens: Tokens): Promise<string> {
      const me = await httpJson<MeResponse>(`${API}/me`, { headers: bearer(tokens.access) });
      if (!me.id) throw new AdapterError('unexpected_response', 'No Spotify user id');
      return me.id;
    },

    async fetchMetrics({ tokens }): Promise<FetchResult> {
      const [saved, following] = await Promise.all([
        httpJson<SavedResponse>(`${API}/me/tracks?limit=1`, { headers: bearer(tokens.access) }),
        httpJson<FollowingResponse>(`${API}/me/following?type=artist&limit=1`, {
          headers: bearer(tokens.access),
        }),
      ]);
      const savedTotal = typeof saved.total === 'number' ? saved.total : null;
      const followingTotal =
        typeof following.artists?.total === 'number' ? following.artists.total : null;
      return {
        metrics: {
          'spotify.saved_tracks': savedTotal,
          'spotify.saved_gain_30d': savedTotal,
          'spotify.following': followingTotal,
        },
      };
    },
  });
}
