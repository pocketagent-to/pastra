import { randomInt } from 'node:crypto';
import { sql } from 'drizzle-orm';
import type { Database } from '@pastra/db';
import { users } from '@pastra/db';

/** Route names and other reserved words a handle may not take (docs/architecture.md section 5). */
export const RESERVED_HANDLES = new Set([
  'pass',
  'offers',
  'card',
  'i',
  'og',
  'api',
  'friends',
  'services',
  'settings',
  'admin',
  'login',
  'logout',
  'signup',
  'start',
  'share',
  'terms',
  'privacy',
  'recover',
  'about',
  'help',
  'support',
  'public',
  'me',
  'onboarding',
  'check-email',
  'well-known',
]);

export type HandleProblem = 'taken' | 'invalid' | 'reserved';

/** Validate a handle: 3–20 chars, lowercase latin / digits / underscore, not reserved. */
export function validateHandle(
  name: string,
): { ok: true } | { ok: false; reason: 'invalid' | 'reserved' } {
  if (!/^[a-z0-9_]{3,20}$/.test(name)) return { ok: false, reason: 'invalid' };
  if (RESERVED_HANDLES.has(name)) return { ok: false, reason: 'reserved' };
  return { ok: true };
}

/** Friend-code alphabet: uppercase letters and digits without look-alikes 0, O, 1, I, L. */
export const FRIEND_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function generateFriendCode(length = 6): string {
  let out = '';
  for (let i = 0; i < length; i++)
    out += FRIEND_CODE_ALPHABET[randomInt(FRIEND_CODE_ALPHABET.length)];
  return out;
}

/** Suggest up to three free variants of a desired handle, given a predicate for availability. */
export async function suggestHandles(
  desired: string,
  isFree: (name: string) => Promise<boolean>,
  count = 3,
): Promise<string[]> {
  const base = desired.replace(/[^a-z0-9_]/g, '').slice(0, 16) || 'player';
  const out: string[] = [];
  let n = 1;
  while (out.length < count && n < 1000) {
    const candidate = `${base}${n}`.slice(0, 20);
    if (validateHandle(candidate).ok && (await isFree(candidate))) out.push(candidate);
    n++;
  }
  return out;
}

/** True if no user currently holds this handle (case-insensitive). */
export async function isHandleFree(db: Database, name: string): Promise<boolean> {
  const [row] = await db
    .select({ id: users.id })
    .from(users)
    .where(sql`lower(${users.handle}) = ${name.toLowerCase()}`);
  return !row;
}

/** Check a handle for the "pick your name" step: availability, reason and up to three suggestions. */
export async function checkHandle(
  db: Database,
  name: string,
): Promise<{ available: boolean; reason?: HandleProblem; suggestions: string[] }> {
  const valid = validateHandle(name);
  const free = (n: string) => isHandleFree(db, n);
  if (!valid.ok) {
    return {
      available: false,
      reason: valid.reason,
      suggestions: await suggestHandles(name, free),
    };
  }
  if (await isHandleFree(db, name)) return { available: true, suggestions: [] };
  return { available: false, reason: 'taken', suggestions: await suggestHandles(name, free) };
}
