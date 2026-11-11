import { eq } from 'drizzle-orm';
import { AXES } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { identities, users, visibility } from '@pastra/db';
import { CoreError } from './errors';

/** The three audiences a pass side can be shown to (docs/product-spec.md section 12). */
export const VISIBILITY_LEVELS = ['everyone', 'friends', 'me'] as const;
export type VisibilityLevel = (typeof VISIBILITY_LEVELS)[number];

const AXIS_SET = new Set<string>(AXES);
const LEVEL_SET = new Set<string>(VISIBILITY_LEVELS);

/** Bio length limit, enforced here because the column is unconstrained (schema comment, EditProfile.html). */
export const MAX_BIO_LENGTH = 80;
/** A sane upper bound for a display name (the mockup field is single-line). */
export const MAX_DISPLAY_NAME_LENGTH = 40;

function normalizeText(value: string | null | undefined): string | null {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
}

/**
 * Set who sees one axis of a user's pass. Writes the `visibility` row (upsert), validating both the
 * axis and the level. Sports defaults to `me`; everything else to `everyone` (applied by readers).
 */
export async function setVisibility(
  db: Database,
  userId: string,
  axis: string,
  level: string,
): Promise<void> {
  if (!AXIS_SET.has(axis)) throw new CoreError('invalid', 'axis');
  if (!LEVEL_SET.has(level)) throw new CoreError('invalid', 'visibility level');
  await db
    .insert(visibility)
    .values({ userId, axis, level: level as VisibilityLevel })
    .onConflictDoUpdate({
      target: [visibility.userId, visibility.axis],
      set: { level: level as VisibilityLevel },
    });
}

export interface ProfileInput {
  displayName?: string | null;
  bio?: string | null;
  country?: string | null;
}

/**
 * Update the free-text profile fields. Only the keys present in `input` are written; unknown fields
 * are ignored. An empty or whitespace-only value clears the field (stored as null). Bio is capped at
 * {@link MAX_BIO_LENGTH} code points.
 */
export async function updateProfile(
  db: Database,
  userId: string,
  input: ProfileInput,
): Promise<void> {
  const patch: Partial<typeof users.$inferInsert> = {};

  if ('displayName' in input) {
    const value = normalizeText(input.displayName);
    if (value !== null && [...value].length > MAX_DISPLAY_NAME_LENGTH) {
      throw new CoreError('invalid', 'display name too long');
    }
    patch.displayName = value;
  }
  if ('bio' in input) {
    const value = normalizeText(input.bio);
    if (value !== null && [...value].length > MAX_BIO_LENGTH) {
      throw new CoreError('invalid', 'bio too long');
    }
    patch.bio = value;
  }
  if ('country' in input) {
    patch.country = normalizeText(input.country);
  }

  if (Object.keys(patch).length === 0) return;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new CoreError('not_found', 'user');

  await db.update(users).set(patch).where(eq(users.id, userId));
}

export interface PreferencesInput {
  offersConsent?: boolean;
  notifyTelegram?: boolean;
  notifyEmail?: boolean;
  showLevel?: boolean;
  showStamps?: boolean;
  showNumbers?: boolean;
  showBio?: boolean;
}

/** The boolean preference columns this operation may write (users table, 10 Nov additions). */
const PREFERENCE_KEYS = [
  'offersConsent',
  'notifyTelegram',
  'notifyEmail',
  'showLevel',
  'showStamps',
  'showNumbers',
  'showBio',
] as const satisfies readonly (keyof PreferencesInput)[];

/**
 * Update the boolean preferences (offers consent, weekly-drop channels, and the "also on my pass"
 * toggles). Only known boolean keys are written; anything else is ignored. A non-boolean value for a
 * known key is rejected.
 */
export async function updatePreferences(
  db: Database,
  userId: string,
  input: PreferencesInput,
): Promise<void> {
  const patch: Partial<typeof users.$inferInsert> = {};
  for (const key of PREFERENCE_KEYS) {
    const value = input[key];
    if (value === undefined) continue;
    if (typeof value !== 'boolean') throw new CoreError('invalid', key);
    patch[key] = value;
  }

  if (Object.keys(patch).length === 0) return;

  const [user] = await db.select().from(users).where(eq(users.id, userId));
  if (!user) throw new CoreError('not_found', 'user');

  await db.update(users).set(patch).where(eq(users.id, userId));
}

export type IdentityKindName = 'email' | 'google';

export interface IdentitySummary {
  kind: IdentityKindName;
  connected: boolean;
}

/**
 * The sign-in methods for a user, as a fixed Email-then-Google list with a connected flag each. The
 * identity `subject` (a Privy user id) is never returned, and emails are never exposed here
 * (docs/architecture.md section 14, "Never log").
 */
export async function getIdentities(db: Database, userId: string): Promise<IdentitySummary[]> {
  const rows = await db.select().from(identities).where(eq(identities.userId, userId));
  const kinds = new Set(rows.map((r) => r.kind));
  return [
    { kind: 'email', connected: kinds.has('email') },
    { kind: 'google', connected: kinds.has('google') },
  ];
}
