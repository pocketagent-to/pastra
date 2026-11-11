import { and, eq, isNull } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { invites } from '@pastra/db';
import { CoreError } from './errors';
import { ensureFriendCode } from './friends';

/**
 * Friend invites (docs/product-spec.md section 10, design/Friends.html + FriendsEmpty.html).
 * The shareable invite link is built from the inviter's stable `friendCode`, so it survives a
 * handle change. This module only maintains the `invites` rows and reminder timestamps — it never
 * sends anything: Telegram/email delivery needs owner keys and is out of scope (architecture §18).
 */

/** How often a pending invite may be reminded. */
const REMIND_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export interface InviteLink {
  /** The inviter's stable friend code, used as the invite slug. */
  code: string;
  /**
   * The shareable link. `[your-domain]` is an open business value (the production domain is not
   * decided yet), so the placeholder stays literal until a real domain is configured — never
   * invent one (CLAUDE.md "Placeholders stay").
   */
  url: string;
}

/**
 * Prepare the viewer's invite link, allocating their friend code on first use and making sure an
 * open (unclaimed) invite row exists to be claimed when someone joins through the link. Idempotent:
 * repeated calls reuse the same friend code and the same open invite row.
 */
export async function createInvite(db: Database, userId: string): Promise<InviteLink> {
  const code = await ensureFriendCode(db, userId);

  const [open] = await db
    .select({ id: invites.id })
    .from(invites)
    .where(and(eq(invites.inviterId, userId), isNull(invites.inviteeId)));
  if (!open) {
    await db.insert(invites).values({ inviterId: userId });
  }

  return { code, url: `[your-domain]/i/${code}` };
}

/**
 * Record that a pending invite was reminded, rate-limited to once per day. This does NOT send the
 * reminder (that needs Telegram/email keys, out of scope) — it only stamps `lastRemindedAt` so the
 * UI and a future sender can respect the cooldown. Throws `not_found` when the invite is unknown or
 * not the caller's, `invalid` when the invitee has already joined, and `rate_limited` within the
 * cooldown window.
 */
export async function remindInvite(db: Database, userId: string, inviteId: string): Promise<void> {
  const [invite] = await db.select().from(invites).where(eq(invites.id, inviteId));
  if (!invite || invite.inviterId !== userId) throw new CoreError('not_found', 'invite');
  if (invite.joinedAt) throw new CoreError('invalid', 'invitee already joined');

  if (invite.lastRemindedAt && Date.now() - invite.lastRemindedAt.getTime() < REMIND_COOLDOWN_MS) {
    throw new CoreError('rate_limited', 'reminded within the last day');
  }

  await db.update(invites).set({ lastRemindedAt: new Date() }).where(eq(invites.id, inviteId));
}
