import { and, eq } from 'drizzle-orm';
import type { Axis, Catalog, Condition, ProviderId } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';
import type { Database } from '@pastra/db';
import { offers as offersTable, userOffers } from '@pastra/db';
import {
  aggregateMetrics,
  computePass,
  evaluateCondition,
  type EvalContext,
  type ScoringConnection,
} from '@pastra/scoring';
import { CoreError } from './errors';
import { buildScoringInput } from './scoring-input';

/**
 * Reject an offer rule that keys on a health-axis metric — health data never drives offers
 * (docs/product-spec.md section 8). Called when an offer is saved in the admin.
 */
export function validateOfferRule(catalog: Catalog, rule: { all: Condition[] }): void {
  const walk = (c: Condition): void => {
    if (c.kind === 'metric_gte') {
      const metric = catalog.metricById.get(c.metric);
      const provider = metric && catalog.providerById.get(metric.provider);
      if (provider?.health) {
        throw new CoreError('invalid', `Offer rule may not use the health metric ${c.metric}`);
      }
    }
    if (c.kind === 'all' || c.kind === 'any') c.of.forEach(walk);
  };
  rule.all.forEach(walk);
}

function buildEvalContext(
  catalog: Catalog,
  connections: ScoringConnection[],
  axes: Record<Axis, number>,
  level: number,
  country: string | undefined,
  hasCard: boolean,
  rewardedFriends: number,
): EvalContext {
  const metrics: Record<string, number> = {};
  const byProvider = new Map<ProviderId, ScoringConnection[]>();
  for (const c of connections) {
    const list = byProvider.get(c.provider) ?? [];
    list.push(c);
    byProvider.set(c.provider, list);
  }
  for (const [provider, conns] of byProvider) {
    const spec = catalog.providerById.get(provider);
    if (spec) Object.assign(metrics, aggregateMetrics(conns, spec));
  }
  const evm = metrics['wallet_evm.nfts'];
  const sol = metrics['wallet_solana.nfts'];
  if (evm !== undefined || sol !== undefined)
    metrics['crypto.nfts_total'] = (evm ?? 0) + (sol ?? 0);

  return {
    axes,
    level,
    connectedProviders: new Set(connections.map((c) => c.provider)),
    metrics,
    country,
    hasCard,
    rewardedFriends,
  };
}

/** The first satisfied metric condition becomes the "because you…" reason. */
function findReason(
  rule: { all: Condition[] },
  ctx: EvalContext,
): { metric: string; value: number } | undefined {
  for (const c of rule.all) {
    if (c.kind === 'metric_gte' && ctx.metrics[c.metric] !== undefined) {
      return { metric: c.metric, value: ctx.metrics[c.metric]! };
    }
  }
  return undefined;
}

/**
 * Select a user's offers for a week and write `user_offers` (docs/product-spec.md section 8,
 * 10 November change). Up to 8 offers, at most 3 per axis, cashback locked without a card.
 */
export async function selectOffers(
  db: Database,
  catalog: Catalog,
  params: {
    userId: string;
    week: string;
    country?: string;
    offersConsent: boolean;
    perUser?: number;
    perAxis?: number;
  },
): Promise<Array<{ offerId: string; state: 'available' | 'locked' }>> {
  const { userId, week, perUser = 8, perAxis = 3 } = params;

  const input = await buildScoringInput(db, catalog, { userId, week });
  const result = computePass(input, catalog);
  const axes = {} as Record<Axis, number>;
  for (const axis of AXES) axes[axis] = result.axes[axis].score;
  const country = params.country ?? input.country;
  const ctx = buildEvalContext(
    catalog,
    input.connections,
    axes,
    result.level,
    country,
    input.hasCard ?? false,
    input.rewardedFriends,
  );

  const active = await db.select().from(offersTable).where(eq(offersTable.active, true));

  const eligible = active
    .filter((o) => {
      if (o.countries && country && !o.countries.includes(country)) return false;
      if (o.countries && !country) return false;
      const rule = (o.rule as { all: Condition[] }) ?? { all: [] };
      if (!params.offersConsent && rule.all.length > 0) return false; // consent off -> general only
      return rule.all.every((c) => evaluateCondition(c, ctx));
    })
    .sort((a, b) => b.priority - a.priority);

  const chosen: typeof active = [];
  const perAxisCount = new Map<string, number>();
  for (const offer of eligible) {
    if (chosen.length >= perUser) break;
    const used = perAxisCount.get(offer.axis) ?? 0;
    if (used >= perAxis) continue;
    perAxisCount.set(offer.axis, used + 1);
    chosen.push(offer);
  }

  const written: Array<{ offerId: string; state: 'available' | 'locked' }> = [];
  for (const offer of chosen) {
    const state: 'available' | 'locked' =
      offer.type === 'cashback' && !ctx.hasCard ? 'locked' : 'available';
    const reason = findReason((offer.rule as { all: Condition[] }) ?? { all: [] }, ctx);
    await db
      .insert(userOffers)
      .values({
        userId,
        offerId: offer.id,
        week,
        state,
        reason: reason as Record<string, unknown> | undefined,
      })
      .onConflictDoUpdate({
        target: [userOffers.userId, userOffers.offerId, userOffers.week],
        set: { state, reason: reason as Record<string, unknown> | undefined },
      });
    written.push({ offerId: offer.id, state });
  }
  return written;
}

/** Activate a cashback offer the user holds (card required). */
export async function activateOffer(
  db: Database,
  params: { userId: string; offerId: string; week: string; hasCard: boolean },
): Promise<void> {
  if (!params.hasCard) throw new CoreError('card_required');
  const [row] = await db
    .select()
    .from(userOffers)
    .where(
      and(
        eq(userOffers.userId, params.userId),
        eq(userOffers.offerId, params.offerId),
        eq(userOffers.week, params.week),
      ),
    );
  if (!row) throw new CoreError('offer_unavailable');
  await db
    .update(userOffers)
    .set({ state: 'activated', activatedAt: new Date() })
    .where(eq(userOffers.id, row.id));
}
