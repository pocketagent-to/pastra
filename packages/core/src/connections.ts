import { and, eq } from 'drizzle-orm';
import type { Catalog, ProviderId } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { connections, metricExtras, metricValues, syncRuns } from '@pastra/db';
import { TokenCipher } from '@pastra/crypto';
import { AdapterError, type AdapterRegistry, type Tokens } from '@pastra/providers';
import { whatIfDisconnect } from '@pastra/scoring';
import { CoreError } from './errors';
import { buildScoringInput } from './scoring-input';
import { recompute } from './recompute';

interface Deps {
  db: Database;
  catalog: Catalog;
  cipher: TokenCipher;
  registry: AdapterRegistry;
}

function encryptTokens(cipher: TokenCipher, tokens: Tokens | undefined) {
  if (!tokens)
    return { accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null, scopes: null };
  return {
    accessTokenEnc: cipher.encrypt(tokens.access),
    refreshTokenEnc: tokens.refresh ? cipher.encrypt(tokens.refresh) : null,
    tokenExpiresAt: tokens.expiresAt ?? null,
    scopes: tokens.scopes.length ? tokens.scopes : null,
  };
}

function decryptTokens(
  cipher: TokenCipher,
  row: typeof connections.$inferSelect,
): Tokens | undefined {
  if (!row.accessTokenEnc) return undefined;
  return {
    access: cipher.decrypt(row.accessTokenEnc),
    refresh: row.refreshTokenEnc ? cipher.decrypt(row.refreshTokenEnc) : undefined,
    expiresAt: row.tokenExpiresAt ?? undefined,
    scopes: row.scopes ?? [],
  };
}

/**
 * Complete a connection flow: verify the callback, enforce one-account-one-pass, store the
 * connection with encrypted tokens, sync it, and recompute the live pass (docs/architecture.md §7).
 */
export async function completeConnection(
  deps: Deps,
  params: {
    userId: string;
    provider: ProviderId;
    week: string;
    params: Record<string, string>;
    state: string;
  },
): Promise<{ connectionId: string }> {
  const { db, cipher, registry } = deps;
  const adapter = registry.get(params.provider);
  const result = await adapter.complete({
    redirectUri: '',
    state: params.state,
    params: params.params,
  });

  const existing = await db
    .select()
    .from(connections)
    .where(
      and(eq(connections.provider, params.provider), eq(connections.externalId, result.externalId)),
    );
  const owned = existing.find((c) => c.userId === params.userId);
  if (existing.length > 0 && !owned) {
    throw new CoreError('already_linked', 'This account is already linked to another pass');
  }

  const enc = encryptTokens(cipher, result.tokens);
  let connectionId: string;
  if (owned) {
    await db
      .update(connections)
      .set({ ...enc, status: 'connected', errorCode: null })
      .where(eq(connections.id, owned.id));
    connectionId = owned.id;
  } else {
    const [row] = await db
      .insert(connections)
      .values({
        userId: params.userId,
        provider: params.provider,
        externalId: result.externalId,
        ...enc,
      })
      .returning();
    connectionId = row!.id;
  }

  await syncConnection(deps, { connectionId, week: params.week });
  await recompute(db, deps.catalog, { userId: params.userId, week: params.week, state: 'live' });
  return { connectionId };
}

/** Fetch a connection's metrics and store them for the week; records the sync run and status. */
export async function syncConnection(
  deps: Deps,
  params: { connectionId: string; week: string },
): Promise<{ status: 'ok' | 'failed' }> {
  const { db, cipher, registry } = deps;
  const [row] = await db.select().from(connections).where(eq(connections.id, params.connectionId));
  if (!row) throw new CoreError('not_found', 'connection');
  const adapter = registry.get(row.provider as ProviderId);
  const started = performance.now();

  try {
    const tokens = decryptTokens(cipher, row);
    const result = await adapter.fetch({ externalId: row.externalId, tokens });

    for (const [metricKey, value] of Object.entries(result.metrics)) {
      if (value === null) continue;
      await db
        .insert(metricValues)
        .values({ connectionId: row.id, metricKey, value, week: params.week })
        .onConflictDoUpdate({
          target: [metricValues.connectionId, metricValues.metricKey, metricValues.week],
          set: { value, fetchedAt: new Date() },
        });
    }
    for (const [key, value] of Object.entries(result.extras ?? {})) {
      await db
        .insert(metricExtras)
        .values({ connectionId: row.id, key, value, week: params.week })
        .onConflictDoUpdate({
          target: [metricExtras.connectionId, metricExtras.key, metricExtras.week],
          set: { value },
        });
    }

    await db
      .update(connections)
      .set({
        status: 'connected',
        errorCode: null,
        staleWeeks: 0,
        lastSyncedAt: new Date(),
        lastSyncedWeek: params.week,
      })
      .where(eq(connections.id, row.id));
    await db.insert(syncRuns).values({
      connectionId: row.id,
      week: params.week,
      status: 'ok',
      durationMs: Math.round(performance.now() - started),
    });
    return { status: 'ok' };
  } catch (error) {
    const code = error instanceof AdapterError ? error.code : 'unexpected_response';
    // auth_expired -> needs_reconnect; private_data/unexpected -> error; transient -> stay connected.
    const status =
      code === 'auth_expired'
        ? 'needs_reconnect'
        : code === 'rate_limited' || code === 'provider_down'
          ? row.status
          : 'error';
    await db.update(connections).set({ status, errorCode: code }).where(eq(connections.id, row.id));
    await db.insert(syncRuns).values({
      connectionId: row.id,
      week: params.week,
      status: 'failed',
      errorCode: code,
      durationMs: Math.round(performance.now() - started),
    });
    return { status: 'failed' };
  }
}

/** Disconnect a service: revoke if supported, delete (cascading metrics), recompute. */
export async function disconnect(
  deps: Deps,
  params: { userId: string; connectionId: string; week: string },
): Promise<void> {
  const { db, cipher, registry, catalog } = deps;
  const [row] = await db.select().from(connections).where(eq(connections.id, params.connectionId));
  if (!row) throw new CoreError('not_found', 'connection');
  if (row.userId !== params.userId) throw new CoreError('forbidden');

  const adapter = registry.get(row.provider as ProviderId);
  if (adapter.revoke) {
    const tokens = decryptTokens(cipher, row);
    if (tokens) await adapter.revoke(tokens).catch(() => undefined);
  }
  await db.delete(connections).where(eq(connections.id, row.id));
  await recompute(db, catalog, { userId: params.userId, week: params.week, state: 'live' });
}

/** Preview the exact axis change from disconnecting a service; the level never drops. */
export async function disconnectPreview(
  deps: Deps,
  params: { userId: string; connectionId: string; week: string },
) {
  const { db, catalog } = deps;
  const [row] = await db.select().from(connections).where(eq(connections.id, params.connectionId));
  if (!row) throw new CoreError('not_found', 'connection');
  if (row.userId !== params.userId) throw new CoreError('forbidden');
  const input = await buildScoringInput(db, catalog, { userId: params.userId, week: params.week });
  return whatIfDisconnect(input, row.provider as ProviderId, catalog);
}
