import { cookies } from 'next/headers';
import { deleteSession, requestDeletion } from '@pastra/core';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/me/delete — mark the account for deletion (docs/product-spec.md section 14). Records
 * intent only; the worker purges the rows later. The session is ended and the cookie cleared, then
 * the client is told where to go next.
 */
export async function POST(): Promise<Response> {
  const user = await requireUser();
  await requestDeletion(getDb(), user.id);

  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  jar.delete(SESSION_COOKIE);

  return Response.json({ redirect: '/signup' });
}
