import { catalog } from '@pastra/catalog';
import { getConfig, directDatabaseUrl, type Config } from '@pastra/config';
import { TokenCipher } from '@pastra/crypto';
import { buildRegistry, type AdapterRegistry } from '@pastra/providers';
import { createCardProvider, type CardProvider } from '@pastra/card';
import { MockMailer, MockTelegram, type Mailer, type TelegramClient } from '@pastra/notify';
import { createDb, type Database } from '@pastra/db';

export interface WorkerDeps {
  config: Config;
  db: Database;
  catalog: typeof catalog;
  cipher: TokenCipher;
  registry: AdapterRegistry;
  card: CardProvider;
  mailer: Mailer;
  telegram: TelegramClient;
}

/** Assemble the worker's dependencies from config. */
export function createDeps(): WorkerDeps {
  const config = getConfig();
  return {
    config,
    // The worker is long-lived and uses the DIRECT endpoint (pg-boss needs LISTEN/NOTIFY and
    // advisory locks, which the pgbouncer pooler does not support).
    db: createDb(directDatabaseUrl(config), 'persistent'),
    catalog,
    cipher: TokenCipher.fromEnv(config.TOKEN_ENC_KEYS),
    registry: buildRegistry(),
    card: createCardProvider({ provider: config.CARD_PROVIDER }),
    mailer: new MockMailer(),
    telegram: new MockTelegram(),
  };
}
