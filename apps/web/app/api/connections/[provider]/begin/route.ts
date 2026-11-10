import { redirect } from 'next/navigation';
import type { ProviderId } from '@pastra/catalog';
import { catalog } from '@pastra/catalog';
import { completeConnection, currentWeek } from '@pastra/core';
import { sha256 } from '@pastra/crypto';
import { coreDeps } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/connections/{provider}/begin — start a connection.
 *
 * With the stub adapters (the local environment) this completes immediately and recomputes the
 * pass, so the connect flow is testable end-to-end. The seed is deterministic per (user, provider),
 * so re-connecting is idempotent. Real OAuth/wallet-signature flows replace this per adapter.
 */
export async function GET(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const user = await getSessionUser();
  if (!user) redirect('/signup');
  if (!user.handle) redirect('/onboarding/name');

  const { provider } = await ctx.params;
  if (!catalog.providerById.has(provider as ProviderId)) redirect('/services');

  const week = currentWeek();
  const seed = sha256(`${user.id}:${provider}`);
  try {
    await completeConnection(coreDeps(), {
      userId: user.id,
      provider: provider as ProviderId,
      week,
      params: { code: seed, address: `0x${seed.slice(0, 40)}` },
      state: seed,
    });
  } catch {
    redirect(`/services/${provider}?error=connect_failed`);
  }
  redirect(`/services/${provider}`);
}
