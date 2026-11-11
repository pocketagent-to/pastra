import { catalog, type ProviderId } from '@pastra/catalog';
import { getConfig } from '@pastra/config';
import { TokenCipher } from '@pastra/crypto';
import { buildRealAdapters, liveProviders as computeLive } from '@pastra/core';
import { buildRegistry } from '@pastra/providers';
import { createDb, type Database } from '@pastra/db';

let dbSingleton: Database | undefined;
let registrySingleton: ReturnType<typeof buildRegistry> | undefined;
let cipherSingleton: TokenCipher | undefined;
let liveSingleton: Set<ProviderId> | undefined;

/** The set of providers wired with real credentials (everything else uses the stub flow). */
export function liveProviders(): Set<ProviderId> {
  liveSingleton ??= computeLive(catalog, getConfig());
  return liveSingleton;
}

export function getDb(): Database {
  // Pool shape depends on how web is hosted: `serverless` (Vercel, pgbouncer pooler) keeps one
  // multiplexed connection per warm instance; `persistent` (long-lived container on direct Postgres)
  // keeps a real pool. Set WEB_DB_POOL=persistent on Railway/Fly/Render/VPS.
  const config = getConfig();
  dbSingleton ??= createDb(config.DATABASE_URL, config.WEB_DB_POOL);
  return dbSingleton;
}

export function getCipher(): TokenCipher {
  cipherSingleton ??= TokenCipher.fromEnv(getConfig().TOKEN_ENC_KEYS);
  return cipherSingleton;
}

export function getRegistry() {
  registrySingleton ??= buildRegistry(buildRealAdapters(getConfig()));
  return registrySingleton;
}

/** Assemble the dependency bundle the `core` operations expect. */
export function coreDeps() {
  return { db: getDb(), catalog, cipher: getCipher(), registry: getRegistry() };
}
