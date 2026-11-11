import { CoreError, setVisibility } from '@pastra/core';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/me/visibility — set who sees one axis of the pass (everyone / friends / me). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: { code: 'forbidden' } }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { axis?: string; level?: string };
  try {
    await setVisibility(getDb(), user.id, body.axis ?? '', body.level ?? '');
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CoreError) {
      return Response.json({ error: { code: error.code } }, { status: 400 });
    }
    throw error;
  }
}
