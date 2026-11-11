import { CoreError, currentWeek, getConnectionProgress } from '@pastra/core';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/connections/{id}/progress — Building-screen poll for a connection's first sync
 * (docs/product-spec.md section 12). Returns the sync status, the metric keys found this week, and
 * whether the sync has finished; metric values themselves are never exposed (architecture §14).
 *
 * The dynamic segment is spelled `[provider]` to match the sibling connection routes (begin /
 * callback / verify / disconnect) — Next.js forbids a differently-named slug at the same path — but
 * its value here is the connection id that the Building page polls with.
 */
export async function GET(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: { code: 'forbidden' } }, { status: 401 });

  const { provider: connectionId } = await ctx.params;
  const week = new URL(request.url).searchParams.get('week') || currentWeek();

  try {
    const progress = await getConnectionProgress(getDb(), user.id, connectionId, week);
    return Response.json(progress);
  } catch (error) {
    if (error instanceof CoreError) {
      const status = error.code === 'not_found' ? 404 : 400;
      return Response.json({ error: { code: error.code } }, { status });
    }
    throw error;
  }
}
