import { currentWeek, getOfferView, getOffersView } from '@pastra/core';
import { coreDeps, getDb } from './server';
import { getCachedDropAtISO } from './live-week';

/** Fallback drop horizon when no week row is live yet (mirrors getPassView in lib/data.ts). */
const DEFAULT_DROP_MS = 3 * 86_400_000;

/** Everything the Offers screen needs: this week's offer cards plus the drop countdown inputs. */
export async function getOffersScreenData(userId: string) {
  const db = getDb();
  const week = currentWeek();
  const [offers, dropAtISO] = await Promise.all([
    getOffersView(db, userId, week),
    getCachedDropAtISO(),
  ]);
  return {
    offers,
    week,
    nextDropAt: dropAtISO ?? new Date(Date.now() + DEFAULT_DROP_MS).toISOString(),
    serverNow: new Date().toISOString(),
  };
}

/** The detail payload for one of the user's offers this week, or null for 404. */
export async function getOfferDetail(userId: string, offerId: string) {
  return getOfferView(coreDeps(), userId, offerId, currentWeek());
}
