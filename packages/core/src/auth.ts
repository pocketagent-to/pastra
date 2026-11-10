import { and, eq } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { identities, users } from '@pastra/db';
import { CoreError } from './errors';
import { generateFriendCode, isHandleFree, validateHandle } from './handles';
import { createSession } from './sessions';

export type IdentityKind = 'google' | 'email';

/**
 * Find or create a user by a verified identity and issue a session (docs/architecture.md section 6,
 * 11.1). With Privy the `subject` is the Privy user id; `kind` is the login method. A brand-new user
 * has no handle yet and is sent to the "pick your name" step.
 */
export async function loginWithIdentity(
  db: Database,
  params: { kind: IdentityKind; subject: string; userAgent?: string },
): Promise<{ userId: string; token: string; expiresAt: Date; isNew: boolean; hasHandle: boolean }> {
  const [existing] = await db
    .select()
    .from(identities)
    .where(and(eq(identities.kind, params.kind), eq(identities.subject, params.subject)));

  let userId: string;
  let isNew = false;
  if (existing) {
    userId = existing.userId;
  } else {
    const [created] = await db
      .insert(users)
      .values({ friendCode: generateFriendCode() })
      .returning();
    userId = created!.id;
    await db
      .insert(identities)
      .values({ userId, kind: params.kind, subject: params.subject, verifiedAt: new Date() });
    isNew = true;
  }

  const session = await createSession(db, userId, params.userAgent);
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  return {
    userId,
    token: session.token,
    expiresAt: session.expiresAt,
    isNew,
    hasHandle: Boolean(user?.handle),
  };
}

/**
 * Claim a handle during onboarding, or change it later (not more than once per 30 days). Also seeds
 * default per-axis visibility (Sports = me) the first time.
 */
export async function claimHandle(db: Database, userId: string, name: string): Promise<void> {
  const normalized = name.toLowerCase();
  const valid = validateHandle(normalized);
  if (!valid.ok) {
    throw new CoreError(valid.reason === 'reserved' ? 'handle_reserved' : 'handle_invalid');
  }

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new CoreError('not_found', 'user');

  if (user.handleChangedAt) {
    const since = Date.now() - user.handleChangedAt.getTime();
    if (since < 30 * 86_400_000)
      throw new CoreError('forbidden', 'Handle can change once per 30 days');
  }

  if (!(await isHandleFree(db, normalized))) throw new CoreError('handle_taken');

  await db
    .update(users)
    .set({ handle: normalized, handleChangedAt: new Date() })
    .where(eq(users.id, userId));
}
