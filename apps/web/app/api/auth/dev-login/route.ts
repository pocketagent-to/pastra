import { cookies } from 'next/headers';
import { getConfig } from '@pastra/config';
import {
  claimHandle,
  createSession,
  getUserByHandle,
  isHandleFree,
  loginWithIdentity,
} from '@pastra/core';
import { getDb } from '@/lib/server';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Development-only sign-in shortcut. Logs in as an existing user by handle (e.g. the seeded
 * `nomad`), or creates a fresh one. Strictly gated: only when DEV_LOGIN_ENABLED and NODE_ENV is
 * development, so it can never be reached in production. Real sign-in goes through Privy.
 */
export async function GET(request: Request) {
  const config = getConfig();
  if (!(config.DEV_LOGIN_ENABLED && config.NODE_ENV === 'development')) {
    return new Response('Not found', { status: 404 });
  }

  const db = getDb();
  const handle = (new URL(request.url).searchParams.get('handle') ?? 'tester').toLowerCase();

  let userId: string;
  let token: string;
  let expiresAt: Date;
  let redirectTo = '/pass';

  const existing = await getUserByHandle(db, handle);
  if (existing) {
    const session = await createSession(db, existing.id, 'dev-login');
    userId = existing.id;
    token = session.token;
    expiresAt = session.expiresAt;
  } else {
    const result = await loginWithIdentity(db, {
      kind: 'email',
      subject: `dev:${handle}`,
      userAgent: 'dev-login',
    });
    userId = result.userId;
    token = result.token;
    expiresAt = result.expiresAt;
    if (result.isNew && (await isHandleFree(db, handle))) {
      try {
        await claimHandle(db, userId, handle);
      } catch {
        redirectTo = '/onboarding/name';
      }
    } else if (!result.hasHandle) {
      redirectTo = '/onboarding/name';
    }
  }

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: false, // dev-login only runs in development
    sameSite: 'lax',
    path: '/',
    expires: expiresAt,
  });
  return Response.redirect(new URL(redirectTo, request.url), 303);
}
