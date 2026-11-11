import { CoreError, updateProfile } from '@pastra/core';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/me/profile — update the free-text profile fields (display name, bio, country). */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: { code: 'forbidden' } }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as {
    displayName?: string | null;
    bio?: string | null;
    country?: string | null;
  };
  const input: { displayName?: string | null; bio?: string | null; country?: string | null } = {};
  if ('displayName' in body) input.displayName = body.displayName ?? null;
  if ('bio' in body) input.bio = body.bio ?? null;
  if ('country' in body) input.country = body.country ?? null;
  try {
    await updateProfile(getDb(), user.id, input);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CoreError) {
      return Response.json({ error: { code: error.code } }, { status: 400 });
    }
    throw error;
  }
}
