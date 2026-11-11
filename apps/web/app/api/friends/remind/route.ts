import { CoreError, remindInvite } from '@pastra/core';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/friends/remind — stamp a pending invite as reminded (rate-limited to once/day). Sending
 * the actual nudge needs Telegram/email keys and is out of scope, so this only records the moment.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: { code: 'forbidden' } }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as { inviteId?: string };
  if (!body.inviteId) {
    return Response.json({ error: { code: 'invalid' } }, { status: 400 });
  }
  try {
    await remindInvite(getDb(), user.id, body.inviteId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CoreError) {
      const status = error.code === 'rate_limited' ? 429 : error.code === 'not_found' ? 404 : 400;
      return Response.json({ error: { code: error.code } }, { status });
    }
    throw error;
  }
}
