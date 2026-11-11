import { currentWeek, disconnect, getUserConnections } from '@pastra/core';
import { coreDeps, getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/connections/{provider}/disconnect — disconnect a service for the signed-in user. The
 * provider's connection is resolved to its id, revoked where supported, its data cascade-deleted,
 * and the live pass recomputed (packages/core disconnect). Returns to Services either way.
 *
 * The segment is spelled `[provider]` to match the sibling connection routes (begin/callback/
 * verify); Next.js forbids a differently-named dynamic segment (`[id]`) at the same path.
 */
export async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.redirect(new URL('/signup', request.url), 303);

  const { provider } = await ctx.params;
  const conns = await getUserConnections(getDb(), user.id);
  const conn = conns.find((c) => c.provider === provider);
  if (conn) {
    await disconnect(coreDeps(), {
      userId: user.id,
      connectionId: conn.id,
      week: currentWeek(),
    });
  }

  return Response.redirect(new URL('/services', request.url), 303);
}
