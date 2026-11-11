import { CoreError, updatePreferences, type PreferencesInput } from '@pastra/core';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/me/preferences — update boolean preferences (offers consent, weekly-drop channels, and
 * the "also on my pass" toggles). Unknown keys are ignored by the core operation.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: { code: 'forbidden' } }, { status: 401 });
  }
  const body = (await request.json().catch(() => ({}))) as PreferencesInput;
  try {
    await updatePreferences(getDb(), user.id, body);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof CoreError) {
      return Response.json({ error: { code: error.code } }, { status: 400 });
    }
    throw error;
  }
}
