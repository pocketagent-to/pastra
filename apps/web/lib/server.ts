import { catalog, type ProviderId } from '@pastra/catalog';
import { getConfig, type Config } from '@pastra/config';
import { TokenCipher } from '@pastra/crypto';
import { buildRegistry } from '@pastra/providers';
import { createDb, type Database } from '@pastra/db';

let dbSingleton: Database | undefined;
let registrySingleton: ReturnType<typeof buildRegistry> | undefined;
let cipherSingleton: TokenCipher | undefined;

/**
 * Which providers have real credentials configured. A provider without its credentials stays on
 * the stub adapter and the stub instant-connect flow, so the demo keeps working until keys are
 * added (docs/architecture.md section 15).
 */
function providerIsConfigured(id: ProviderId, c: Config): boolean {
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
    default:
      return false;
  }
}

let liveSingleton: Set<ProviderId> | undefined;

/** The set of providers wired with real credentials (everything else uses the stub flow). */
export function liveProviders(): Set<ProviderId> {
  if (liveSingleton) return liveSingleton;
  const c = getConfig();
  liveSingleton = new Set(
    catalog.providers.map((p) => p.id).filter((id) => providerIsConfigured(id, c)),
  );
  return liveSingleton;
}

export function getDb(): Database {
  dbSingleton ??= createDb(getConfig().DATABASE_URL);
  return dbSingleton;
}

export function getCipher(): TokenCipher {
  cipherSingleton ??= TokenCipher.fromEnv(getConfig().TOKEN_ENC_KEYS);
  return cipherSingleton;
}

export function getRegistry() {
  registrySingleton ??= buildRegistry();
  return registrySingleton;
}

/** Assemble the dependency bundle the `core` operations expect. */
export function coreDeps() {
  return { db: getDb(), catalog, cipher: getCipher(), registry: getRegistry() };
}
