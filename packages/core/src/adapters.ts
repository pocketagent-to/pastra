import type { Catalog, ProviderId } from '@pastra/catalog';
import type { Config } from '@pastra/config';
import {
  createAlchemyEvmIndexer,
  createAniListAdapter,
  createAppleMusicAdapter,
  createBattlenetAdapter,
  createDiscordAdapter,
  createEvmWalletAdapter,
  createFaceitAdapter,
  createFarcasterAdapter,
  createFoursquareAdapter,
  createGitHubAdapter,
  createHeliusSolanaIndexer,
  createLichessAdapter,
  createLinkedinAdapter,
  createMyAnimeListAdapter,
  createOsuAdapter,
  createOuraAdapter,
  createPolarAdapter,
  createSolanaWalletAdapter,
  createSpotifyAdapter,
  createSteamAdapter,
  createTelegramAdapter,
  createTerraAdapter,
  createTidalAdapter,
  createTonapiIndexer,
  createTonWalletAdapter,
  createTwitchAdapter,
  createWhoopAdapter,
  createWithingsAdapter,
  createXAdapter,
  createYouTubeAdapter,
  type ProviderAdapter,
} from '@pastra/providers';

/**
 * Runtime wiring of real provider adapters from configuration. Lives in `core` (the composition
 * layer) so BOTH the web app and the background worker build the SAME real adapters — the worker's
 * weekly drop must sync real data, not stubs (docs/architecture.md section 4, 15).
 */

/** Whether a provider has its real credentials configured; otherwise it stays on the stub flow. */
export function providerIsConfigured(id: ProviderId, c: Config): boolean {
  const pair = (a: string, b: string) => Boolean(a && b);
  switch (id) {
    case 'steam':
      return Boolean(c.STEAM_WEB_API_KEY);
    case 'twitch':
      return pair(c.TWITCH_CLIENT_ID, c.TWITCH_CLIENT_SECRET);
    case 'lichess':
      return Boolean(c.LICHESS_CLIENT_ID);
    case 'x':
      return pair(c.X_CLIENT_ID, c.X_CLIENT_SECRET);
    case 'discord':
      return pair(c.DISCORD_CLIENT_ID, c.DISCORD_CLIENT_SECRET);
    case 'github':
      return pair(c.GITHUB_CLIENT_ID, c.GITHUB_CLIENT_SECRET);
    case 'tidal':
      return pair(c.TIDAL_CLIENT_ID, c.TIDAL_CLIENT_SECRET);
    case 'youtube':
      return pair(c.GOOGLE_CLIENT_ID, c.GOOGLE_CLIENT_SECRET);
    case 'anilist':
      return pair(c.ANILIST_CLIENT_ID, c.ANILIST_CLIENT_SECRET);
    case 'apple_music':
      return Boolean(c.APPLE_MUSIC_KEY);
    case 'polar':
      return pair(c.POLAR_CLIENT_ID, c.POLAR_CLIENT_SECRET);
    case 'whoop':
      return pair(c.WHOOP_CLIENT_ID, c.WHOOP_CLIENT_SECRET);
    case 'oura':
      return pair(c.OURA_CLIENT_ID, c.OURA_CLIENT_SECRET);
    case 'wallet_evm':
      return Boolean(c.ALCHEMY_KEY);
    case 'wallet_solana':
      return Boolean(c.HELIUS_KEY);
    case 'wallet_ton':
      return Boolean(c.TONAPI_KEY);
    case 'faceit':
      return Boolean(c.FACEIT_CLIENT_ID && c.FACEIT_CLIENT_SECRET && c.FACEIT_API_KEY);
    case 'battlenet':
      return pair(c.BATTLENET_CLIENT_ID, c.BATTLENET_CLIENT_SECRET);
    case 'osu':
      return pair(c.OSU_CLIENT_ID, c.OSU_CLIENT_SECRET);
    case 'telegram':
      return Boolean(c.TELEGRAM_BOT_TOKEN);
    case 'farcaster':
      return Boolean(c.NEYNAR_API_KEY);
    case 'linkedin':
      return pair(c.LINKEDIN_CLIENT_ID, c.LINKEDIN_CLIENT_SECRET);
    case 'myanimelist':
      return pair(c.MYANIMELIST_CLIENT_ID, c.MYANIMELIST_CLIENT_SECRET);
    case 'withings':
      return pair(c.WITHINGS_CLIENT_ID, c.WITHINGS_CLIENT_SECRET);
    case 'foursquare':
      return pair(c.FOURSQUARE_CLIENT_ID, c.FOURSQUARE_CLIENT_SECRET);
    case 'spotify':
      return pair(c.SPOTIFY_CLIENT_ID, c.SPOTIFY_CLIENT_SECRET);
    case 'terra':
      return pair(c.TERRA_DEV_ID, c.TERRA_API_KEY);
    default:
      return false;
  }
}

/** The set of providers wired with real credentials (everything else uses the stub flow). */
export function liveProviders(catalog: Catalog, c: Config): Set<ProviderId> {
  return new Set(catalog.providers.map((p) => p.id).filter((id) => providerIsConfigured(id, c)));
}

/** Build the real adapters whose credentials are present; the rest fall back to stubs. */
export function buildRealAdapters(c: Config): Partial<Record<ProviderId, ProviderAdapter>> {
  const real: Partial<Record<ProviderId, ProviderAdapter>> = {};
  const domain = (() => {
    try {
      return new URL(c.APP_URL).host;
    } catch {
      return 'hextra';
    }
  })();

  if (c.STEAM_WEB_API_KEY) real.steam = createSteamAdapter({ webApiKey: c.STEAM_WEB_API_KEY });
  if (c.TWITCH_CLIENT_ID && c.TWITCH_CLIENT_SECRET)
    real.twitch = createTwitchAdapter({
      clientId: c.TWITCH_CLIENT_ID,
      clientSecret: c.TWITCH_CLIENT_SECRET,
    });
  if (c.LICHESS_CLIENT_ID) real.lichess = createLichessAdapter({ clientId: c.LICHESS_CLIENT_ID });
  if (c.X_CLIENT_ID && c.X_CLIENT_SECRET)
    real.x = createXAdapter({ clientId: c.X_CLIENT_ID, clientSecret: c.X_CLIENT_SECRET });
  if (c.DISCORD_CLIENT_ID && c.DISCORD_CLIENT_SECRET)
    real.discord = createDiscordAdapter({
      clientId: c.DISCORD_CLIENT_ID,
      clientSecret: c.DISCORD_CLIENT_SECRET,
    });
  if (c.GITHUB_CLIENT_ID && c.GITHUB_CLIENT_SECRET)
    real.github = createGitHubAdapter({
      clientId: c.GITHUB_CLIENT_ID,
      clientSecret: c.GITHUB_CLIENT_SECRET,
    });
  if (c.TIDAL_CLIENT_ID && c.TIDAL_CLIENT_SECRET)
    real.tidal = createTidalAdapter({
      clientId: c.TIDAL_CLIENT_ID,
      clientSecret: c.TIDAL_CLIENT_SECRET,
    });
  if (c.GOOGLE_CLIENT_ID && c.GOOGLE_CLIENT_SECRET)
    real.youtube = createYouTubeAdapter({
      clientId: c.GOOGLE_CLIENT_ID,
      clientSecret: c.GOOGLE_CLIENT_SECRET,
    });
  if (c.ANILIST_CLIENT_ID && c.ANILIST_CLIENT_SECRET)
    real.anilist = createAniListAdapter({
      clientId: c.ANILIST_CLIENT_ID,
      clientSecret: c.ANILIST_CLIENT_SECRET,
    });
  if (c.APPLE_MUSIC_KEY)
    real.apple_music = createAppleMusicAdapter({ developerToken: c.APPLE_MUSIC_KEY });
  if (c.POLAR_CLIENT_ID && c.POLAR_CLIENT_SECRET)
    real.polar = createPolarAdapter({
      clientId: c.POLAR_CLIENT_ID,
      clientSecret: c.POLAR_CLIENT_SECRET,
    });
  if (c.WHOOP_CLIENT_ID && c.WHOOP_CLIENT_SECRET)
    real.whoop = createWhoopAdapter({
      clientId: c.WHOOP_CLIENT_ID,
      clientSecret: c.WHOOP_CLIENT_SECRET,
    });
  if (c.OURA_CLIENT_ID && c.OURA_CLIENT_SECRET)
    real.oura = createOuraAdapter({
      clientId: c.OURA_CLIENT_ID,
      clientSecret: c.OURA_CLIENT_SECRET,
    });
  if (c.ALCHEMY_KEY)
    real.wallet_evm = createEvmWalletAdapter({
      domain,
      indexer: createAlchemyEvmIndexer({ apiKey: c.ALCHEMY_KEY, chains: c.EVM_CHAINS }),
    });
  if (c.HELIUS_KEY)
    real.wallet_solana = createSolanaWalletAdapter({
      domain,
      indexer: createHeliusSolanaIndexer({ apiKey: c.HELIUS_KEY }),
    });
  if (c.TONAPI_KEY)
    real.wallet_ton = createTonWalletAdapter({
      domain,
      indexer: createTonapiIndexer({ apiKey: c.TONAPI_KEY }),
    });

  if (c.FACEIT_CLIENT_ID && c.FACEIT_CLIENT_SECRET && c.FACEIT_API_KEY)
    real.faceit = createFaceitAdapter({
      clientId: c.FACEIT_CLIENT_ID,
      clientSecret: c.FACEIT_CLIENT_SECRET,
      dataApiKey: c.FACEIT_API_KEY,
    });
  if (c.BATTLENET_CLIENT_ID && c.BATTLENET_CLIENT_SECRET)
    real.battlenet = createBattlenetAdapter({
      clientId: c.BATTLENET_CLIENT_ID,
      clientSecret: c.BATTLENET_CLIENT_SECRET,
    });
  if (c.OSU_CLIENT_ID && c.OSU_CLIENT_SECRET)
    real.osu = createOsuAdapter({ clientId: c.OSU_CLIENT_ID, clientSecret: c.OSU_CLIENT_SECRET });
  if (c.TELEGRAM_BOT_TOKEN)
    real.telegram = createTelegramAdapter({ botToken: c.TELEGRAM_BOT_TOKEN });
  if (c.NEYNAR_API_KEY)
    real.farcaster = createFarcasterAdapter({ neynarApiKey: c.NEYNAR_API_KEY, domain });
  if (c.LINKEDIN_CLIENT_ID && c.LINKEDIN_CLIENT_SECRET)
    real.linkedin = createLinkedinAdapter({
      clientId: c.LINKEDIN_CLIENT_ID,
      clientSecret: c.LINKEDIN_CLIENT_SECRET,
    });
  if (c.MYANIMELIST_CLIENT_ID && c.MYANIMELIST_CLIENT_SECRET)
    real.myanimelist = createMyAnimeListAdapter({
      clientId: c.MYANIMELIST_CLIENT_ID,
      clientSecret: c.MYANIMELIST_CLIENT_SECRET,
    });
  if (c.WITHINGS_CLIENT_ID && c.WITHINGS_CLIENT_SECRET)
    real.withings = createWithingsAdapter({
      clientId: c.WITHINGS_CLIENT_ID,
      clientSecret: c.WITHINGS_CLIENT_SECRET,
    });
  if (c.FOURSQUARE_CLIENT_ID && c.FOURSQUARE_CLIENT_SECRET)
    real.foursquare = createFoursquareAdapter({
      clientId: c.FOURSQUARE_CLIENT_ID,
      clientSecret: c.FOURSQUARE_CLIENT_SECRET,
    });
  if (c.SPOTIFY_CLIENT_ID && c.SPOTIFY_CLIENT_SECRET)
    real.spotify = createSpotifyAdapter({
      clientId: c.SPOTIFY_CLIENT_ID,
      clientSecret: c.SPOTIFY_CLIENT_SECRET,
    });
  if (c.TERRA_DEV_ID && c.TERRA_API_KEY)
    real.terra = createTerraAdapter({ devId: c.TERRA_DEV_ID, apiKey: c.TERRA_API_KEY });
  return real;
}
