import { currentWeek, getLivePass } from '@pastra/core';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/pass — the current live pass for the signed-in user. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { error: { code: 'forbidden', message: 'Not signed in' } },
      { status: 401 },
    );
  }
  const week = currentWeek();
  const snapshot = await getLivePass(getDb(), user.id, week);
  if (!snapshot) {
    return Response.json({ handle: user.handle, week, empty: true });
  }
  return Response.json({
    handle: user.handle,
    week,
    level: snapshot.level,
    points: snapshot.points,
    title: snapshot.title,
    axes: snapshot.axes,
    keyNumbers: snapshot.keyNumbers,
    serverNow: new Date().toISOString(),
  });
}
