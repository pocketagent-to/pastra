import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { and, eq } from 'drizzle-orm';
import { connections, metricValues, users, uuidv7 } from '@pastra/db';
import { createTestDb } from '@pastra/db/testing';
import type { Database } from '@pastra/db';

let db: Database;
let close: () => Promise<void>;

beforeAll(async () => {
  ({ db, close } = await createTestDb());
});

afterAll(async () => {
  await close();
});

describe('db schema (docs/architecture.md section 5)', () => {
  it('generates time-ordered UUID v7 ids', () => {
    const a = uuidv7();
    const b = uuidv7();
    expect(a).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(a).not.toBe(b);
  });

  it('inserts and reads a user', async () => {
    const [row] = await db
      .insert(users)
      .values({ handle: 'nomad', country: 'PL', peakPoints: 391 })
      .returning();
    expect(row?.handle).toBe('nomad');
    expect(row?.status).toBe('active');
    expect(row?.showLevel).toBe(true);
  });

  it('enforces case-insensitive unique handles', async () => {
    await db.insert(users).values({ handle: 'kira' });
    await expect(db.insert(users).values({ handle: 'KIRA' })).rejects.toThrow();
  });

  it('cascade-deletes metric values when a connection is removed', async () => {
    const [user] = await db.insert(users).values({ handle: 'casc' }).returning();
    const [conn] = await db
      .insert(connections)
      .values({ userId: user!.id, provider: 'steam', externalId: `steam-${uuidv7()}` })
      .returning();
    await db.insert(metricValues).values({
      connectionId: conn!.id,
      metricKey: 'steam.hours_total',
      value: 2140,
      week: '2026-W46',
    });

    expect(
      await db.select().from(metricValues).where(eq(metricValues.connectionId, conn!.id)),
    ).toHaveLength(1);
    await db.delete(connections).where(eq(connections.id, conn!.id));
    expect(
      await db.select().from(metricValues).where(eq(metricValues.connectionId, conn!.id)),
    ).toHaveLength(0);
  });

  it('enforces the one-account-one-pass unique on (provider, external_id)', async () => {
    const [u1] = await db.insert(users).values({ handle: 'u1' }).returning();
    const [u2] = await db.insert(users).values({ handle: 'u2' }).returning();
    await db.insert(connections).values({ userId: u1!.id, provider: 'x', externalId: 'acct-1' });
    await expect(
      db.insert(connections).values({ userId: u2!.id, provider: 'x', externalId: 'acct-1' }),
    ).rejects.toThrow();
  });

  it('stores a weekly metric snapshot keyed by (connection, metric, week)', async () => {
    const [user] = await db.insert(users).values({ handle: 'snap' }).returning();
    const [conn] = await db
      .insert(connections)
      .values({ userId: user!.id, provider: 'twitch', externalId: `tw-${uuidv7()}` })
      .returning();
    await db.insert(metricValues).values({
      connectionId: conn!.id,
      metricKey: 'twitch.subscriptions',
      value: 42,
      week: '2026-W46',
    });
    const rows = await db
      .select()
      .from(metricValues)
      .where(
        and(
          eq(metricValues.connectionId, conn!.id),
          eq(metricValues.metricKey, 'twitch.subscriptions'),
        ),
      );
    expect(rows[0]?.value).toBe(42);
  });
});
