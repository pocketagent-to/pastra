import { addFriendByCode, CoreError } from '@pastra/core';
import { coreDeps } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/friends/add — add a friend by their code. Returns the friend profile to redirect to. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: { code: 'forbidden' } }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { code?: string };
  try {
    const friend = await addFriendByCode(coreDeps(), user.id, body.code ?? '');
    return Response.json({ ok: true, redirect: `/friends/${friend.handle}` });
  } catch (error) {
    if (error instanceof CoreError) {
      return Response.json({ error: { code: error.code } }, { status: 400 });
    }
    throw error;
  }
}
