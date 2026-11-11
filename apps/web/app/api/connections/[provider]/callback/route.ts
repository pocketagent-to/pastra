import { redirect } from 'next/navigation';
import { catalog, type ProviderId } from '@pastra/catalog';
import { getConfig } from '@pastra/config';
import {
  completeConnection,
  consumeConnectionChallenge,
  CoreError,
  currentWeek,
} from '@pastra/core';
import { coreDeps, getDb } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/connections/{provider}/callback — the OAuth/OpenID return (docs/architecture.md §7).
 * Verifies the one-time state, exchanges the code (or verifies the OpenID assertion) via the
 * adapter, stores the connection, syncs and recomputes, then returns the user to the service screen.
 */
export async function GET(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const providerId = provider as ProviderId;
  if (!catalog.providerById.has(providerId)) redirect('/services');

  const q = new URL(request.url).searchParams;
  const oauthError = q.get('error');
  if (oauthError) redirect(`/services/${provider}?error=${encodeURIComponent(oauthError)}`);

  const state = q.get('state') ?? '';
  const challenge = state ? await consumeConnectionChallenge(getDb(), state) : null;
  if (!challenge || challenge.provider !== providerId) {
    redirect(`/services/${provider}?error=bad_state`);
  }

  const params: Record<string, string> = {};
  for (const [k, v] of q.entries()) params[k] = v;
  if (challenge.codeVerifier) params.codeVerifier = challenge.codeVerifier;
  if (challenge.nonce) params.nonce = challenge.nonce;

  const redirectUri = `${getConfig().APP_URL}/api/connections/${provider}/callback`;

  try {
    await completeConnection(coreDeps(), {
      userId: challenge.userId,
      provider: providerId,
      week: currentWeek(),
      params,
      state,
      redirectUri,
    });
  } catch (error) {
    const code = error instanceof CoreError ? error.code : 'connect_failed';
    redirect(`/services/${provider}?error=${code}`);
  }

  redirect(`/services/${provider}`);
}
