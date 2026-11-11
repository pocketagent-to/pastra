import { and, eq, isNull, or } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import {
  auditLog,
  connections,
  friendships,
  stamps,
  userOffers,
  users,
  visibility,
} from '@pastra/db';
import { CoreError } from './errors';

/** Level grows with peak points only (docs/product-spec.md "Level only grows"). */
function levelFromPeak(peakPoints: number): number {
  return 1 + Math.floor(peakPoints / 15);
}

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

/**
 * A user's own data, shaped for a GDPR download (docs/product-spec.md section 14). Secrets never
 * appear here: connections carry ids and providers only — no access/refresh tokens, no external
 * account ids, no scopes.
 */
export interface AccountExport {
  exportedAt: string;
  profile: {
    id: string;
    handle: string | null;
    displayName: string | null;
    bio: string | null;
    avatarKey: string | null;
    friendCode: string | null;
    country: string | null;
    status: 'active' | 'deleting';
    invitedBy: string | null;
    peakPoints: number;
    level: number;
    offersConsent: boolean;
    cardSpendConsent: boolean;
    notifyTelegram: boolean;
    notifyEmail: boolean;
    showLevel: boolean;
    showStamps: boolean;
    showNumbers: boolean;
    showBio: boolean;
    createdAt: string | null;
  };
  connections: Array<{
    id: string;
    provider: string;
    status: 'connected' | 'needs_reconnect' | 'error';
    lastSyncedWeek: string | null;
    createdAt: string | null;
  }>;
  stamps: Array<{ key: string; tier: number | null; awardedWeek: string | null }>;
  visibility: Array<{ axis: string; level: 'everyone' | 'friends' | 'me' }>;
  friendships: Array<{ friendId: string; source: 'invite' | 'code'; since: string | null }>;
  offers: Array<{
    offerId: string;
    week: string;
    state: 'available' | 'locked' | 'activated' | 'used' | 'expired';
    activatedAt: string | null;
    usedAt: string | null;
  }>;
}

/**
 * Assemble the user's own data for a self-service export. Reads only; no tokens or external ids are
 * included, so the result is safe to hand straight to the user (docs/architecture.md section 14).
 */
export async function buildExport(db: Database, userId: string): Promise<AccountExport> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new CoreError('not_found', 'user');

  const [connRows, stampRows, visRows, offerRows, friendRows] = await Promise.all([
    db.select().from(connections).where(eq(connections.userId, userId)),
    db
      .select()
      .from(stamps)
      .where(and(eq(stamps.userId, userId), isNull(stamps.revokedAt))),
    db.select().from(visibility).where(eq(visibility.userId, userId)),
    db.select().from(userOffers).where(eq(userOffers.userId, userId)),
    db
      .select()
      .from(friendships)
      .where(or(eq(friendships.userA, userId), eq(friendships.userB, userId))),
  ]);

  return {
    exportedAt: new Date().toISOString(),
    profile: {
      id: user.id,
      handle: user.handle,
      displayName: user.displayName,
      bio: user.bio,
      avatarKey: user.avatarKey,
      friendCode: user.friendCode,
      country: user.country,
      status: user.status,
      invitedBy: user.invitedBy,
      peakPoints: user.peakPoints,
      level: levelFromPeak(user.peakPoints),
      offersConsent: user.offersConsent,
      cardSpendConsent: user.cardSpendConsent,
      notifyTelegram: user.notifyTelegram,
      notifyEmail: user.notifyEmail,
      showLevel: user.showLevel,
      showStamps: user.showStamps,
      showNumbers: user.showNumbers,
      showBio: user.showBio,
      createdAt: toIso(user.createdAt),
    },
    // ids and providers only — tokens, external ids and scopes are deliberately omitted.
    connections: connRows.map((c) => ({
      id: c.id,
      provider: c.provider,
      status: c.status,
      lastSyncedWeek: c.lastSyncedWeek,
      createdAt: toIso(c.createdAt),
    })),
    stamps: stampRows.map((s) => ({ key: s.stampKey, tier: s.tier, awardedWeek: s.awardedWeek })),
    visibility: visRows.map((v) => ({ axis: v.axis, level: v.level })),
    friendships: friendRows.map((f) => ({
      friendId: f.userA === userId ? f.userB : f.userA,
      source: f.source,
      since: toIso(f.createdAt),
    })),
    offers: offerRows.map((o) => ({
      offerId: o.offerId,
      week: o.week,
      state: o.state,
      activatedAt: toIso(o.activatedAt),
      usedAt: toIso(o.usedAt),
    })),
  };
}

/**
 * Mark the account for deletion (docs/product-spec.md section 14). This only records intent — the
 * row is flipped to `deleting` with a `deletedAt` stamp and an audit entry; the background worker
 * purges the rows later. Nothing is hard-deleted here, and no secrets are logged. Idempotent: a
 * second request on an already-deleting account is a no-op.
 */
export async function requestDeletion(db: Database, userId: string): Promise<void> {
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new CoreError('not_found', 'user');
  if (user.status === 'deleting') return;

  await db
    .update(users)
    .set({ status: 'deleting', deletedAt: new Date() })
    .where(eq(users.id, userId));
  await db.insert(auditLog).values({
    actor: userId,
    action: 'account.deletion_requested',
    subject: userId,
  });
}
