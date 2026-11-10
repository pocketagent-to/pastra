import { and, eq, gt } from 'drizzle-orm';
import { randomToken, sha256 } from '@pastra/crypto';
import type { Database } from '@pastra/db';
import { sessions, users } from '@pastra/db';

const SESSION_DAYS = 30;

/** Create a session: a random token in the cookie, its SHA-256 hash in the database. */
export async function createSession(
  db: Database,
  userId: string,
  userAgent?: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomToken();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.insert(sessions).values({ userId, tokenHash: sha256(token), expiresAt, userAgent });
  return { token, expiresAt };
}

/** Resolve the current user from a cookie token; renews last-seen. Returns null if invalid. */
export async function getUserByToken(db: Database, token: string) {
  const [session] = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.tokenHash, sha256(token)), gt(sessions.expiresAt, new Date())));
  if (!session) return null;
  await db.update(sessions).set({ lastSeenAt: new Date() }).where(eq(sessions.id, session.id));
  const [user] = await db.select().from(users).where(eq(users.id, session.userId));
  return user ?? null;
}

/** Delete a session (log out). */
export async function deleteSession(db: Database, token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, sha256(token)));
}
