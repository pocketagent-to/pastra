import { and, desc, eq, isNull, or, sql } from 'drizzle-orm';
import type { Axis, Catalog } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { friendships, invites, users } from '@pastra/db';
import { CoreError } from './errors';
import { generateFriendCode } from './handles';
import { currentWeek, getLivePass, getUserByHandle, getVisibility } from './reads';
import { toPublicPass, type VisibilityLevel } from './public-pass';

/**
 * Friends: friend codes, the friends list, add-by-code, friend profiles and the compare view
 * (docs/product-spec.md section 12). Built on the existing `friendships`, `invites` and
 * `users.friendCode` columns — no schema changes. A friend sees another's `friends`-visibility
 * axes (not the `me`-private ones); visibility is applied through `toPublicPass`.
 */

interface FriendsDeps {
  db: Database;
}

type UserRow = typeof users.$inferSelect;
type PassSnap = Awaited<ReturnType<typeof getLivePass>>;
type VisRows = Awaited<ReturnType<typeof getVisibility>>;

export interface FriendSummary {
  handle: string;
  level: number;
  /** "You lead in N of 6 sides" / "Leads you in N of 6 sides" (design/Friends.html). */
  summary: string;
}

export interface PendingInvite {
  id: string;
  handle: string;
}

export interface FriendsView {
  /** The viewer's own friend code, allocated on first view. */
  friendCode: string;
  handle: string;
  friends: FriendSummary[];
  /** Invited people who haven't joined yet (only those with a resolvable handle). */
  pending: PendingInvite[];
  empty: boolean;
}

export interface FriendProfileView {
  handle: string;
  level: number;
  title: string;
  /** Friend-visible axis scores; `me`-private axes are 0. */
  axes: Record<Axis, number>;
}

export interface CompareSide {
  handle: string;
  level: number;
  axes: Record<Axis, number>;
}

export interface CompareView {
  me: CompareSide;
  friend: CompareSide;
}

function visibilityMap(rows: VisRows): Record<string, VisibilityLevel> {
  const map: Record<string, VisibilityLevel> = {};
  for (const row of rows) map[row.axis] = row.level;
  return map;
}

/** A user's own axis scores (every side visible to themselves). */
function ownAxes(snapshot: PassSnap): Record<Axis, number> {
  const axes = (snapshot?.axes ?? {}) as Record<string, { score: number }>;
  const out = {} as Record<Axis, number>;
  for (const axis of AXES) out[axis] = axes[axis]?.score ?? 0;
  return out;
}

/** A user's axis scores as a friend sees them: `me`-private sides collapse to 0. */
function friendVisibleAxes(
  user: UserRow,
  snapshot: PassSnap,
  visRows: VisRows,
): Record<Axis, number> {
  const pass = toPublicPass({
    user: {
      handle: user.handle ?? '',
      displayName: user.displayName,
      bio: user.bio,
      showLevel: user.showLevel,
      showStamps: user.showStamps,
      showNumbers: user.showNumbers,
      showBio: user.showBio,
    },
    snapshot: {
      axes: (snapshot?.axes ?? {}) as Record<string, { score: number; topPct: number | null }>,
      level: snapshot?.level ?? 1,
      title: snapshot?.title ?? 'Newcomer',
      keyNumbers: (snapshot?.keyNumbers ?? []) as Array<{
        axis: Axis;
        value: string;
        label: string;
      }>,
    },
    visibility: visibilityMap(visRows),
    viewer: 'friend',
    stamps: [],
  });
  const out = {} as Record<Axis, number>;
  for (const axis of AXES) out[axis] = pass.axes[axis].score;
  return out;
}

/** Count the sides the viewer leads (ties count to the viewer) and phrase it. */
function leadSummary(mine: Record<Axis, number>, friend: Record<Axis, number>): string {
  let myLeads = 0;
  for (const axis of AXES) if (mine[axis] >= friend[axis]) myLeads++;
  const friendLeads = AXES.length - myLeads;
  return friendLeads > myLeads
    ? `Leads you in ${friendLeads} of 6 sides`
    : `You lead in ${myLeads} of 6 sides`;
}

/** The pair key for a friendship, stored once with `user_a < user_b`. */
function pairKey(u1: string, u2: string): [string, string] {
  return u1 < u2 ? [u1, u2] : [u2, u1];
}

async function areFriends(db: Database, u1: string, u2: string): Promise<boolean> {
  const [a, b] = pairKey(u1, u2);
  const [row] = await db
    .select({ userA: friendships.userA })
    .from(friendships)
    .where(and(eq(friendships.userA, a), eq(friendships.userB, b)));
  return Boolean(row);
}

/**
 * Return the user's friend code, allocating a unique one on first use. The code is 6 uppercase
 * characters from the friend-code alphabet; uniqueness is guarded by the `users_friend_code_idx`.
 */
export async function ensureFriendCode(db: Database, userId: string): Promise<string> {
  const [existing] = await db
    .select({ friendCode: users.friendCode })
    .from(users)
    .where(eq(users.id, userId));
  if (!existing) throw new CoreError('not_found', 'user');
  if (existing.friendCode) return existing.friendCode;

  for (let attempt = 0; attempt < 24; attempt++) {
    const code = generateFriendCode(6);
    const [clash] = await db.select({ id: users.id }).from(users).where(eq(users.friendCode, code));
    if (clash) continue;
    try {
      await db
        .update(users)
        .set({ friendCode: code })
        .where(and(eq(users.id, userId), isNull(users.friendCode)));
    } catch {
      // A concurrent writer took this code; re-read below and retry if still unset.
    }
    const [after] = await db
      .select({ friendCode: users.friendCode })
      .from(users)
      .where(eq(users.id, userId));
    if (after?.friendCode) return after.friendCode;
  }
  throw new CoreError('invalid', 'could not allocate a friend code');
}

/**
 * The Friends screen view (design/Friends.html, design/FriendsEmpty.html): the viewer's friend
 * code, their friends with a one-line lead summary, and pending invites that haven't joined yet.
 */
export async function getFriendsView(
  db: Database,
  catalog: Catalog,
  userId: string,
  week: string,
): Promise<FriendsView> {
  const friendCode = await ensureFriendCode(db, userId);
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me) throw new CoreError('not_found', 'user');

  const mySnap = await getLivePass(db, userId, week);
  const mine = ownAxes(mySnap);

  const links = await db
    .select()
    .from(friendships)
    .where(or(eq(friendships.userA, userId), eq(friendships.userB, userId)))
    .orderBy(desc(friendships.createdAt));
  const friendIds = links.map((row) => (row.userA === userId ? row.userB : row.userA));

  const friends: FriendSummary[] = [];
  for (const friendId of friendIds) {
    const [friendUser] = await db.select().from(users).where(eq(users.id, friendId));
    if (!friendUser || !friendUser.handle) continue;
    const [snap, vis] = await Promise.all([
      getLivePass(db, friendId, week),
      getVisibility(db, friendId),
    ]);
    friends.push({
      handle: friendUser.handle,
      level: snap?.level ?? 1,
      summary: leadSummary(mine, friendVisibleAxes(friendUser, snap, vis)),
    });
  }

  const inviteRows = await db
    .select()
    .from(invites)
    .where(and(eq(invites.inviterId, userId), isNull(invites.joinedAt)))
    .orderBy(desc(invites.createdAt));
  const pending: PendingInvite[] = [];
  for (const invite of inviteRows) {
    if (!invite.inviteeId) continue;
    const [invitee] = await db
      .select({ handle: users.handle })
      .from(users)
      .where(eq(users.id, invite.inviteeId));
    if (invitee?.handle) pending.push({ id: invite.id, handle: invitee.handle });
  }

  return {
    friendCode,
    handle: me.handle ?? '',
    friends,
    pending,
    empty: friends.length === 0,
  };
}

/**
 * Add a friend by their code (design/AddFriend.html). Case-insensitive match; `invalid` for your
 * own code, `not_found` when no one holds it, `already_linked` when already friends. On success a
 * `code`-sourced friendship row is inserted (no reward — rewards are for invites only).
 */
export async function addFriendByCode(
  deps: FriendsDeps,
  userId: string,
  code: string,
): Promise<{ handle: string; level: number }> {
  const { db } = deps;
  const normalized = code.trim();
  if (!normalized) throw new CoreError('not_found', 'friend code');

  const [target] = await db
    .select()
    .from(users)
    .where(sql`lower(${users.friendCode}) = ${normalized.toLowerCase()}`);
  if (target && target.id === userId) throw new CoreError('invalid', 'cannot add yourself');
  if (!target) throw new CoreError('not_found', 'friend code');

  const [a, b] = pairKey(userId, target.id);
  const [existing] = await db
    .select({ userA: friendships.userA })
    .from(friendships)
    .where(and(eq(friendships.userA, a), eq(friendships.userB, b)));
  if (existing) throw new CoreError('already_linked', 'already friends');

  try {
    await db.insert(friendships).values({ userA: a, userB: b, source: 'code' });
  } catch {
    // Lost a race to the (user_a, user_b) primary key: they are now friends.
    throw new CoreError('already_linked', 'already friends');
  }

  const snap = await getLivePass(db, target.id, currentWeek());
  return { handle: target.handle ?? '', level: snap?.level ?? 1 };
}

/**
 * A friend's profile (design/FriendProfile.html): their level, title and the axis scores they
 * share with friends. Returns null when the handle is unknown or the viewer is not their friend.
 */
export async function getFriendProfile(
  db: Database,
  catalog: Catalog,
  viewerId: string,
  handle: string,
  week: string,
): Promise<FriendProfileView | null> {
  const target = await getUserByHandle(db, handle);
  if (!target || !target.handle) return null;
  if (!(await areFriends(db, viewerId, target.id))) return null;

  const [snap, vis] = await Promise.all([
    getLivePass(db, target.id, week),
    getVisibility(db, target.id),
  ]);
  return {
    handle: target.handle,
    level: snap?.level ?? 1,
    title: snap?.title ?? 'Newcomer',
    axes: friendVisibleAxes(target, snap, vis),
  };
}

/**
 * The compare view (design/Compare.html): the viewer's own six axes against a friend's
 * friend-visible six axes. Returns null when the handle is unknown or the two are not friends.
 */
export async function compareFriends(
  db: Database,
  catalog: Catalog,
  userId: string,
  handle: string,
  week: string,
): Promise<CompareView | null> {
  const [me] = await db.select().from(users).where(eq(users.id, userId));
  if (!me || !me.handle) return null;
  const target = await getUserByHandle(db, handle);
  if (!target || !target.handle) return null;
  if (!(await areFriends(db, userId, target.id))) return null;

  const [mySnap, friendSnap, friendVis] = await Promise.all([
    getLivePass(db, userId, week),
    getLivePass(db, target.id, week),
    getVisibility(db, target.id),
  ]);

  return {
    me: { handle: me.handle, level: mySnap?.level ?? 1, axes: ownAxes(mySnap) },
    friend: {
      handle: target.handle,
      level: friendSnap?.level ?? 1,
      axes: friendVisibleAxes(target, friendSnap, friendVis),
    },
  };
}
