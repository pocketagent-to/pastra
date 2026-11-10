import type { Axis, Condition, MetricKey, ProviderId } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';

/**
 * Context a {@link Condition} is evaluated against. Shared by stamp rules (docs/architecture.md §8)
 * and offer rules (docs/product-spec.md §10), so the two never diverge.
 */
export interface EvalContext {
  axes: Record<Axis, number>;
  level: number;
  /** Providers currently linked to the pass (present in the scoring input). */
  connectedProviders: Set<ProviderId>;
  /** Aggregated metric values present on the pass, plus derived keys like `crypto.nfts_total`. */
  metrics: Record<MetricKey, number>;
  country?: string;
  hasCard: boolean;
  rewardedFriends: number;
}

/** Evaluate a condition against a pass context. Pure and total. */
export function evaluateCondition(condition: Condition, ctx: EvalContext): boolean {
  switch (condition.kind) {
    case 'axis_gte':
      return ctx.axes[condition.axis] >= condition.value;
    case 'connected':
      return ctx.connectedProviders.has(condition.provider);
    case 'metric_gte': {
      const value = ctx.metrics[condition.metric];
      return value !== undefined && value >= condition.value;
    }
    case 'level_gte':
      return ctx.level >= condition.value;
    case 'country_in':
      return ctx.country !== undefined && condition.countries.includes(ctx.country);
    case 'has_card':
      return ctx.hasCard;
    case 'all_axes_positive':
      return AXES.every((axis) => ctx.axes[axis] > 0);
    case 'rewarded_friends_gte':
      return ctx.rewardedFriends >= condition.value;
    case 'all':
      return condition.of.every((c) => evaluateCondition(c, ctx));
    case 'any':
      return condition.of.some((c) => evaluateCondition(c, ctx));
  }
}
