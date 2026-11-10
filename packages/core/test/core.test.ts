import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { catalog } from '@pastra/catalog';
import { TokenCipher } from '@pastra/crypto';
import { buildRegistry } from '@pastra/providers';
import {
  connections,
  merchants,
  offers,
  passSnapshots,
  recaps,
  users,
  weeks,
  type Database,
} from '@pastra/db';
import { createTestDb } from '@pastra/db/testing';
import {
  completeConnection,
  computeDraft,
  disconnect,
  disconnectPreview,
  isoWeekString,
  prepareWeek,
  publishDrop,
  selectOffers,
  syncConnection,
  toPublicPass,
  validateHandle,
  validateOfferRule,
} from '@pastra/core';

let db: Database;
let close: () => Promise<void>;
const deps = () => ({
  db,
  catalog,
  cipher: TokenCipher.fromEnv('v1:test-key'),
  registry: buildRegistry(),
});

async function newUser(handle: string, country = 'PL'): Promise<string> {
  const [row] = await db.insert(users).values({ handle, country, offersConsent: true }).returning();
  return row!.id;
}

async function connectionId(userId: string, provider: string): Promise<string> {
  const [row] = await db
    .select()
    .from(connections)
    .where(and(eq(connections.userId, userId), eq(connections.provider, provider)));
  return row!.id;
}

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});
afterAll(async () => {
  await close();
});

const WEEK = '2026-W46';

describe('connect / recompute / disconnect (docs/architecture.md section 7)', () => {
  it('connects a service, syncs it, and writes a live pass with a non-zero axis', async () => {
    const userId = await newUser('nomad');
    await completeConnection(deps(), {
      userId,
      provider: 'steam',
      week: WEEK,
      params: { code: 'steam-code' },
      state: 's',
    });
    const [snap] = await db
      .select()
      .from(passSnapshots)
      .where(
        and(
          eq(passSnapshots.userId, userId),
          eq(passSnapshots.week, WEEK),
          eq(passSnapshots.state, 'live'),
        ),
      );
    expect(snap).toBeDefined();
    const axes = snap!.axes as Record<string, { score: number }>;
    expect(axes.gaming!.score).toBeGreaterThan(0);
    expect(snap!.points).toBeGreaterThan(0);
  });

  it('previews and performs a disconnect, cascading the metrics away', async () => {
    const userId = await newUser('kira');
    await completeConnection(deps(), {
      userId,
      provider: 'steam',
      week: WEEK,
      params: { code: 'c' },
      state: 's',
    });
    const cid = await connectionId(userId, 'steam');

    const preview = await disconnectPreview(deps(), { userId, connectionId: cid, week: WEEK });
    expect(preview.axisDeltas.gaming).toBeLessThan(0);
    expect(preview.levelStays).toBe(true);

    await disconnect(deps(), { userId, connectionId: cid, week: WEEK });
    expect(await db.select().from(connections).where(eq(connections.id, cid))).toHaveLength(0);
    const [snap] = await db
      .select()
      .from(passSnapshots)
      .where(and(eq(passSnapshots.userId, userId), eq(passSnapshots.state, 'live')));
    expect((snap!.axes as Record<string, { score: number }>).gaming!.score).toBe(0);
  });

  it('refuses to link a service account that is already on another pass', async () => {
    const a = await newUser('owner');
    const b = await newUser('thief');
    await completeConnection(deps(), {
      userId: a,
      provider: 'x',
      week: WEEK,
      params: { code: 'same' },
      state: 's',
    });
    await expect(
      completeConnection(deps(), {
        userId: b,
        provider: 'x',
        week: WEEK,
        params: { code: 'same' },
        state: 's',
      }),
    ).rejects.toThrow(/already/);
  });
});

describe('offers (docs/product-spec.md section 8, 10)', () => {
  it('rejects an offer rule that keys on a health metric', () => {
    expect(() =>
      validateOfferRule(catalog, {
        all: [{ kind: 'metric_gte', metric: 'polar.weeks_streak', value: 1 }],
      }),
    ).toThrow();
    expect(() =>
      validateOfferRule(catalog, { all: [{ kind: 'axis_gte', axis: 'gaming', value: 40 }] }),
    ).not.toThrow();
  });

  it('selects matching offers; cashback is locked without a card, promo is available', async () => {
    const userId = await newUser('crypto_fan');
    await completeConnection(deps(), {
      userId,
      provider: 'wallet_evm',
      week: WEEK,
      params: { address: '0xabcdef0000000000000000000000000000000001' },
      state: 's',
    });

    const [m] = await db.insert(merchants).values({ name: '[PARTNER A]' }).returning();
    const [cashback] = await db
      .insert(offers)
      .values({
        merchantId: m!.id,
        type: 'cashback',
        axis: 'crypto',
        headline: '8% back',
        priority: 10,
        rule: { all: [{ kind: 'axis_gte', axis: 'crypto', value: 1 }] },
      })
      .returning();
    const [promo] = await db
      .insert(offers)
      .values({
        merchantId: m!.id,
        type: 'promo',
        axis: 'gaming',
        headline: 'CODE',
        priority: 5,
        rule: { all: [] },
      })
      .returning();

    const written = await selectOffers(db, catalog, {
      userId,
      week: WEEK,
      country: 'PL',
      offersConsent: true,
    });
    const byId = new Map(written.map((w) => [w.offerId, w.state]));
    expect(byId.get(cashback!.id)).toBe('locked');
    expect(byId.get(promo!.id)).toBe('available');
  });
});

describe('weekly drop (docs/product-spec.md section 7)', () => {
  it('prepares, drafts and publishes a drop, closing the previous week', async () => {
    const userId = await newUser('dropper');
    await completeConnection(deps(), {
      userId,
      provider: 'steam',
      week: WEEK,
      params: { code: 'd' },
      state: 's',
    });
    await prepareWeek(db, { week: WEEK, dropAt: new Date('2026-11-16T12:00:00Z') });

    const next = '2026-W47';
    const cid = await connectionId(userId, 'steam');
    await syncConnection(deps(), { connectionId: cid, week: next });
    await computeDraft(db, catalog, { week: next, userIds: [userId] });
    await prepareWeek(db, { week: next, dropAt: new Date('2026-11-23T12:00:00Z') });
    await publishDrop(db, catalog, { week: next, prevWeek: WEEK, userIds: [userId] });

    const [live] = await db
      .select()
      .from(passSnapshots)
      .where(
        and(
          eq(passSnapshots.userId, userId),
          eq(passSnapshots.week, next),
          eq(passSnapshots.state, 'live'),
        ),
      );
    expect(live).toBeDefined();
    expect(
      await db
        .select()
        .from(recaps)
        .where(and(eq(recaps.userId, userId), eq(recaps.week, next))),
    ).toHaveLength(1);
    const [prevWeekRow] = await db.select().from(weeks).where(eq(weeks.week, WEEK));
    expect(prevWeekRow!.status).toBe('closed');
  });
});

describe('utilities', () => {
  it('validates handles and ISO weeks', () => {
    expect(validateHandle('nomad').ok).toBe(true);
    expect(validateHandle('ab').ok).toBe(false);
    expect(validateHandle('Card').ok).toBe(false); // uppercase -> invalid
    expect(validateHandle('card').ok).toBe(false); // reserved
    expect(isoWeekString(new Date('2021-01-04T00:00:00Z'))).toBe('2021-W01');
  });

  it('hides a private axis from a public viewer', () => {
    const pass = toPublicPass({
      user: {
        handle: 'nomad',
        showLevel: true,
        showStamps: true,
        showNumbers: true,
        showBio: true,
      },
      snapshot: {
        axes: { gaming: { score: 94, topPct: 6 }, sports: { score: 40, topPct: null } },
        level: 27,
        title: 'Gamer',
        keyNumbers: [{ axis: 'sports', value: '10', label: 'h' }],
      },
      visibility: { gaming: 'everyone', sports: 'me' },
      viewer: 'public',
      stamps: [{ key: 'marathoner', label: 'Marathoner', axis: 'sports' }],
    });
    expect(pass.axes.gaming.visible).toBe(true);
    expect(pass.axes.sports.visible).toBe(false);
    expect(pass.axes.sports.score).toBe(0);
    expect(pass.keyNumbers).toHaveLength(0); // sports key number hidden
    expect(pass.stamps).toHaveLength(0); // sports stamp hidden
  });
});
