import { catalog, type ProviderId } from '@pastra/catalog';
import {
  completeConnection,
  consumeConnectionChallenge,
  CoreError,
  currentWeek,
} from '@pastra/core';
import { coreDeps, getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/connections/{provider}/verify — complete a wallet-signature connection. The sign page
 * sends { state, address, signature, message, ... }; the adapter verifies the signature and the
 * connection is stored, synced and recomputed (docs/architecture.md section 7).
 */
export async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: { code: 'forbidden' } }, { status: 401 });

  const { provider } = await ctx.params;
  const providerId = provider as ProviderId;
  if (!catalog.providerById.has(providerId)) {
    return Response.json({ error: { code: 'not_found' } }, { status: 404 });
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const state = typeof body.state === 'string' ? body.state : '';
  const challenge = state ? await consumeConnectionChallenge(getDb(), state) : null;
  if (!challenge || challenge.userId !== user.id || challenge.provider !== providerId) {
    return Response.json({ error: { code: 'bad_state' } }, { status: 400 });
  }

  const params: Record<string, string> = {};
  for (const [k, v] of Object.entries(body)) {
    if (typeof v === 'string') params[k] = v;
  }
  if (challenge.nonce) params.nonce = challenge.nonce;

  try {
    await completeConnection(coreDeps(), {
      userId: user.id,
      provider: providerId,
      week: currentWeek(),
      params,
      state,
    });
  } catch (error) {
    const code = error instanceof CoreError ? error.code : 'connect_failed';
    return Response.json({ error: { code } }, { status: 400 });
  }

  return Response.json({ ok: true, redirect: `/services/${provider}` });
}
