import { joinCardWaitlist } from '@pastra/core';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/card/waitlist — add the signed-in user to the card beta-access waitlist (idempotent). */
export async function POST() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: { code: 'forbidden' } }, { status: 401 });
  }
  await joinCardWaitlist(getDb(), user.id);
  return Response.json({ ok: true, joined: true });
}
