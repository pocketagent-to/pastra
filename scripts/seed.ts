/**
 * Seed the database with the example data set (nomad, week 46). Run against a live Postgres:
 *   docker compose up -d && pnpm --filter @pastra/db migrate && pnpm db:seed
 */
import { catalog } from '@pastra/catalog';
import { getConfig } from '@pastra/config';
import { TokenCipher } from '@pastra/crypto';
import { buildRegistry } from '@pastra/providers';
import { createDb } from '@pastra/db';
import {
  connections,
  merchants,
  offers,
  passSnapshots,
  recaps,
  stamps,
  userOffers,
  users,
  visibility,
  weeks,
} from '@pastra/db';
import { completeConnection, currentWeek, mondayOf, selectOffers } from '@pastra/core';

const db = createDb(getConfig().DATABASE_URL);
const deps = {
  db,
  catalog,
  cipher: TokenCipher.fromEnv(getConfig().TOKEN_ENC_KEYS),
  registry: buildRegistry(),
};

async function clean() {
  // Order matters only where cascades apply (connections -> metrics). Dev-only wipe.
  for (const table of [
    recaps,
    userOffers,
    offers,
    merchants,
    passSnapshots,
    stamps,
    visibility,
    connections,
    weeks,
    users,
  ]) {
    await db.delete(table);
  }
}

async function main() {
  await clean();
  const week = currentWeek();
  const dropAt = new Date(mondayOf(week).getTime() + 7 * 86_400_000 + 12 * 3_600_000); // next Monday 12:00 UTC
  await db.insert(weeks).values({ week, dropAt, status: 'live' });

  const [nomad] = await db
    .insert(users)
    .values({ handle: 'nomad', displayName: 'Nomad', country: 'PL', offersConsent: true })
    .returning();
  for (const axis of ['sports', 'gaming', 'crypto', 'music', 'social', 'lifestyle']) {
    await db
      .insert(visibility)
      .values({ userId: nomad!.id, axis, level: axis === 'sports' ? 'me' : 'everyone' });
  }

  const seeds: Array<
    [Parameters<typeof completeConnection>[1]['provider'], Record<string, string>]
  > = [
    ['steam', { code: 'steam-seed' }],
    ['wallet_evm', { address: '0xabcdef0000000000000000000000000000000abc' }],
    ['discord', { code: 'discord-seed' }],
    ['github', { code: 'github-seed' }],
    ['tidal', { code: 'tidal-seed' }],
  ];
  for (const [provider, params] of seeds) {
    await completeConnection(deps, { userId: nomad!.id, provider, week, params, state: 'seed' });
  }

  const [partnerA] = await db.insert(merchants).values({ name: '[PARTNER A]' }).returning();
  await db.insert(offers).values([
    {
      merchantId: partnerA!.id,
      type: 'cashback',
      axis: 'gaming',
      headline: '8% back',
      priority: 10,
      rule: { all: [{ kind: 'axis_gte', axis: 'gaming', value: 40 }] },
    },
    {
      merchantId: partnerA!.id,
      type: 'promo',
      axis: 'crypto',
      headline: 'PASTRA10',
      priority: 5,
      sharedCode: 'PASTRA10',
      codeMode: 'shared',
      rule: { all: [] },
    },
  ]);
  await selectOffers(db, catalog, { userId: nomad!.id, week, country: 'PL', offersConsent: true });

  // A few friends.
  for (const handle of ['kira', 'volt', 'mara']) {
    await db.insert(users).values({ handle, country: 'PL' });
  }

  console.log(`Seeded user "nomad" for week ${week} with ${seeds.length} services.`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
