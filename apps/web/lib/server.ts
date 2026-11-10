import { catalog } from '@pastra/catalog';
import { getConfig } from '@pastra/config';
import { TokenCipher } from '@pastra/crypto';
import { buildRegistry } from '@pastra/providers';
import { createDb, type Database } from '@pastra/db';

let dbSingleton: Database | undefined;
let registrySingleton: ReturnType<typeof buildRegistry> | undefined;
let cipherSingleton: TokenCipher | undefined;

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
