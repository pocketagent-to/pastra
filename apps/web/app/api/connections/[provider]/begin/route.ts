import { redirect } from 'next/navigation';
import { catalog, type ProviderId } from '@pastra/catalog';
import { getConfig } from '@pastra/config';
import { completeConnection, createConnectionChallenge, currentWeek } from '@pastra/core';
import { sha256 } from '@pastra/crypto';
import { coreDeps, getDb, liveProviders } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/connections/{provider}/begin — start a connection.
 *
 * With real credentials the user is sent to the service's OAuth/OpenID flow (or a wallet-signature
 * page); the service returns to {provider}/callback. Without credentials the provider stays on the
 * stub adapter, which completes immediately with deterministic demo metrics so the flow stays
 * testable end-to-end (docs/architecture.md section 7, section 15).
 */
export async function GET(_request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/signup');
  if (!user.handle) redirect('/onboarding/name');

  const { provider } = await ctx.params;
  const providerId = provider as ProviderId;
  if (!catalog.providerById.has(providerId)) redirect('/services');

  // Stub flow (no real credentials): complete immediately with demo metrics.
  if (!liveProviders().has(providerId)) {
    const seed = sha256(`${user.id}:${provider}`);
    try {
      await completeConnection(coreDeps(), {
        userId: user.id,
        provider: providerId,
        week: currentWeek(),
        params: { code: seed, address: `0x${seed.slice(0, 40)}` },
        state: seed,
      });
    } catch {
      redirect(`/services/${provider}?error=connect_failed`);
    }
    redirect(`/services/${provider}`);
  }

  // Real flow: create a one-time challenge and hand off to the service.
  const deps = coreDeps();
  const adapter = deps.registry.get(providerId);
  const { state, nonce, codeChallenge } = await createConnectionChallenge(getDb(), {
    userId: user.id,
    provider: providerId,
    usePkce: true,
  });
  const redirectUri = `${getConfig().APP_URL}/api/connections/${provider}/callback`;

  let begin: Awaited<ReturnType<typeof adapter.begin>>;
  try {
    begin = await adapter.begin({ userId: user.id, redirectUri, state, nonce, codeChallenge });
  } catch {
    redirect(`/services/${provider}?error=begin_failed`);
  }

  if ('redirectUrl' in begin) redirect(begin.redirectUrl);
  // Wallet signature: the sign page collects the signature and POSTs {provider}/verify.
  const sp = new URLSearchParams({ state, message: begin.messageToSign });
  redirect(`/services/${provider}/sign?${sp.toString()}`);
}
