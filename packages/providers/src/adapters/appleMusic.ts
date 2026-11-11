import { createHash } from 'node:crypto';
import { AdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import type {
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
} from '../types';

/**
 * Apple Music adapter (MusicKit; docs/architecture.md section 7).
 *
 * Apple Music has no OAuth redirect. The Music User Token is minted in the browser by MusicKit JS
 * and handed to us once. So `begin` sends the browser to one of our own app pages that loads
 * MusicKit JS (`connectPath`, default `/connect/apple-music`); that page runs `MusicKit.authorize()`
 * to obtain the Music User Token and POSTs it, with the anti-forgery `state`, to
 * `POST /api/connections/apple_music/verify`, which calls `complete` with `params.musicUserToken`.
 * `complete` stores that token as the connection's access token. There is no `refresh`: the token is
 * short-lived, so frequent `auth_expired` is expected — the user re-runs MusicKit to reconnect.
 *
 * `fetch` calls `https://api.music.apple.com/v1/me/...` with BOTH the developer token
 * (`cfg.developerToken`, env `APPLE_MUSIC_KEY`) as the `Authorization: Bearer` and the per-user
 * `Music-User-Token` header.
 *
 * Catalog metrics (packages/catalog/src/providers.ts), all `source: 'api'`:
 *   - `apple_music.tracks`             volume    tracks in the user's library ("Tracks in library")
 *   - `apple_music.artists_rotation`   activity  distinct artists in the user's heavy rotation
 *                                                 ("Artists in rotation")
 *   - `apple_music.playlists`          depth     playlists in the user's library ("Playlists")
 *
 * Privacy (catalog `consent`, docs/architecture.md section 14): we read only COUNTS — the size of the
 * library (songs, playlists) and the small heavy-rotation feed. We never read the full listening
 * history or any payment/entitlement data, and no track/artist names leave this adapter as metrics
 * (heavy-rotation artist names are reduced to a count here).
 */

const API_BASE = 'https://api.music.apple.com/v1/me';
/** Default path on our own app that loads MusicKit JS and mints the Music User Token. */
const DEFAULT_CONNECT_PATH = '/connect/apple-music';
/** The heavy-rotation feed is capped at 10 items by the API; we only need the distinct artists. */
const HEAVY_ROTATION_LIMIT = 10;

export interface AppleMusicConfig {
  /**
   * The MusicKit developer token (a signed ES256 JWT), from the env var `APPLE_MUSIC_KEY`. Used as
   * the `Authorization: Bearer` on every Apple Music API call. Short-lived (max 6 months): the owner
   * rotates it.
   */
  developerToken: string;
  /**
   * Path on our own app that runs MusicKit JS and obtains the Music User Token. `begin` redirects the
   * browser here (on the callback origin) carrying `state`. Default `/connect/apple-music`.
   */
  connectPath?: string;
}

/** A library resource list response; library endpoints report the collection size in `meta.total`. */
interface LibraryListResponse {
  meta?: { total?: number };
  data?: unknown[];
}

/** A heavy-rotation resource (album/playlist/station); albums carry `attributes.artistName`. */
interface HeavyRotationResource {
  attributes?: { artistName?: string };
}

interface HeavyRotationResponse {
  data?: HeavyRotationResource[];
}

/** Read the `meta.total` size of a library collection, or null when the API omits it. */
async function libraryTotal(url: string, headers: Record<string, string>): Promise<number | null> {
  const res = await httpJson<LibraryListResponse>(`${url}?limit=1`, { headers });
  const total = res?.meta?.total;
  return typeof total === 'number' ? total : null;
}

/** Count the distinct artists that appear in the user's heavy-rotation feed (0 when it is empty). */
async function heavyRotationArtists(headers: Record<string, string>): Promise<number> {
  const res = await httpJson<HeavyRotationResponse>(
    `${API_BASE}/history/heavy-rotation?limit=${HEAVY_ROTATION_LIMIT}`,
    { headers },
  );
  const artists = new Set<string>();
  for (const item of res?.data ?? []) {
    const name = item?.attributes?.artistName;
    if (name) artists.add(name);
  }
  return artists.size;
}

/**
 * Apple Music adapter. The developer token is injected via config; an unconfigured adapter refuses to
 * begin so the registry can fall back to the stub (docs/architecture.md section 15).
 */
export function createAppleMusicAdapter(cfg: AppleMusicConfig): ProviderAdapter {
  const developerToken = cfg.developerToken;
  const configured = Boolean(developerToken);
  const connectPath = cfg.connectPath ?? DEFAULT_CONNECT_PATH;

  return {
    id: 'apple_music',
    auth: 'musickit',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      if (!configured) throw new AdapterError('provider_down', 'apple_music is not configured');
      // No external authorize endpoint: send the browser to our own MusicKit page, which mints the
      // Music User Token and posts it back to the verify endpoint. The realm is the callback origin.
      const page = new URL(connectPath, new URL(ctx.redirectUri).origin);
      page.searchParams.set('state', ctx.state);
      return { redirectUrl: page.toString() };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const musicUserToken = ctx.params.musicUserToken;
      if (!musicUserToken) {
        throw new AdapterError('unexpected_response', 'Missing Music User Token');
      }
      // Apple exposes no stable per-user id through MusicKit, so the external id is derived from the
      // token itself (never the raw token). Note: it changes when the user re-authorises — see report.
      const externalId = `apple_music-${createHash('sha256')
        .update(musicUserToken)
        .digest('hex')
        .slice(0, 16)}`;
      return { externalId, tokens: { access: musicUserToken, scopes: [] } };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      if (!configured) throw new AdapterError('provider_down', 'apple_music is not configured');
      const userToken = ctx.tokens?.access;
      if (!userToken) throw new AdapterError('auth_expired', 'No Music User Token for this connection');

      const headers = bearer(developerToken, { 'music-user-token': userToken });

      const tracks = await libraryTotal(`${API_BASE}/library/songs`, headers);
      const playlists = await libraryTotal(`${API_BASE}/library/playlists`, headers);
      const artistsRotation = await heavyRotationArtists(headers);

      return {
        metrics: {
          'apple_music.tracks': tracks,
          'apple_music.artists_rotation': artistsRotation,
          'apple_music.playlists': playlists,
        },
      };
    },
  };
}
