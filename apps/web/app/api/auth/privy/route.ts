import { cookies } from 'next/headers';
import { PrivyClient } from '@privy-io/server-auth';
import { getConfig } from '@pastra/config';
import { loginWithIdentity, type IdentityKind } from '@pastra/core';
import { getDb } from '@/lib/server';
import { SESSION_COOKIE } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/privy — exchange a Privy access token for a Pastra session (docs/architecture.md
 * section 11.1). The Privy user id becomes `identities.subject`; sessions stay ours.
 */
export async function POST(request: Request) {
  const config = getConfig();
  if (!config.PRIVY_APP_ID || !config.PRIVY_APP_SECRET) {
    return Response.json(
      { error: { code: 'not_configured', message: 'Privy keys are not set' } },
      { status: 503 },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { token?: string };
  if (!body.token) {
    return Response.json({ error: { code: 'invalid', message: 'Missing token' } }, { status: 400 });
  }

  const privy = new PrivyClient(config.PRIVY_APP_ID, config.PRIVY_APP_SECRET);
  let subject: string;
  try {
    const claims = await privy.verifyAuthToken(body.token);
    subject = claims.userId;
  } catch {
    return Response.json(
      { error: { code: 'forbidden', message: 'Invalid token' } },
      { status: 401 },
    );
  }

  // The login method becomes the identity kind; default to email.
  let kind: IdentityKind = 'email';
  try {
    const user = await privy.getUser(subject);
    if (user.google) kind = 'google';
  } catch {
    // Non-fatal: keep the default kind.
  }

  const result = await loginWithIdentity(getDb(), {
    kind,
    subject,
    userAgent: request.headers.get('user-agent') ?? undefined,
  });

  (await cookies()).set(SESSION_COOKIE, result.token, {
    httpOnly: true,
    secure: config.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: result.expiresAt,
  });

  return Response.json({ redirect: result.hasHandle ? '/pass' : '/onboarding/name' });
}
