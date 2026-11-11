import { cache } from 'react';
import { cookies } from 'next/headers';
import { getUserByToken } from '@pastra/core';
import { getDb } from './server';

export const SESSION_COOKIE = 'pastra_session';

/**
 * Resolve the signed-in user from the session cookie, or null. Wrapped in React `cache()` so
 * repeated reads within one render (page + any layout/metadata) dedupe to a single DB round-trip.
 */
export const getSessionUser = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return getUserByToken(getDb(), token);
});
