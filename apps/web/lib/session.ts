import { cookies } from 'next/headers';
import { getUserByToken } from '@pastra/core';
import { getDb } from './server';

export const SESSION_COOKIE = 'pastra_session';

/** Resolve the signed-in user from the session cookie, or null. */
export async function getSessionUser() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserByToken(getDb(), token);
}
