import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { deleteSession } from '@pastra/core';
import { getDb } from '@/lib/server';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** POST /api/auth/logout — invalidate the session and clear the cookie (the client clears Privy). */
export async function POST() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await deleteSession(getDb(), token);
  jar.delete(SESSION_COOKIE);
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, '', { path: '/', maxAge: 0 });
  return res;
}
