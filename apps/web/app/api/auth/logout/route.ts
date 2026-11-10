import { cookies } from 'next/headers';
import { deleteSession } from '@pastra/core';
import { getDb } from '@/lib/server';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — delete the session and clear the cookie. */
export async function POST(request: Request) {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  jar.delete(SESSION_COOKIE);
  return Response.redirect(new URL('/signup', request.url), 303);
}
