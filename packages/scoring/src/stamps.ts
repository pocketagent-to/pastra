import type { Catalog, MetricKey, StampSpec } from '@pastra/catalog';
import type { EvalContext } from './conditions';
import { evaluateCondition } from './conditions';
import { fillTemplate } from './format';
import type { StampRecord } from './types';

function earnStamp(
  spec: StampSpec,
  ctx: EvalContext,
  aggregated: Record<MetricKey, number>,
  labelVars: Record<string, string | number>,
): StampRecord | null {
  if (spec.kind === 'service') {
    if (spec.provider && ctx.connectedProviders.has(spec.provider)) {
      return { key: spec.key, axis: spec.axis, kind: 'service', label: spec.label };
    }
    return null;
  }

  if (spec.tiers && spec.tierMetric) {
    const value = aggregated[spec.tierMetric];
    if (value === undefined) return null;
    let reached: { tier: number; label: string } | undefined;
    for (const tier of spec.tiers) {
      if (value >= tier.value) reached = tier;
    }
    if (!reached) return null;
    return {
      key: spec.key,
      axis: spec.axis,
      kind: 'achievement',
      label: fillTemplate(reached.label, labelVars),
      tier: reached.tier,
    };
  }

  if (spec.condition && evaluateCondition(spec.condition, ctx)) {
    return {
      key: spec.key,
      axis: spec.axis,
      kind: 'achievement',
      label: fillTemplate(spec.label, labelVars),
    };
  }
  return null;
}

/**
 * Compute the stamp delta for a pass (docs/product-spec.md section 6.9).
 *
 * - Service stamps are earned while the provider is connected and revoked when it is disconnected.
 * - Achievement stamps are earned once and never revoked; a tiered stamp upgrades to a higher tier.
 */
export function computeStampDelta(
  catalog: Catalog,
  ctx: EvalContext,
  aggregated: Record<MetricKey, number>,
  existing: StampRecord[],
  labelVars: Record<string, string | number> = {},
): { awarded: StampRecord[]; revoked: StampRecord[] } {
  const earned: StampRecord[] = [];
  for (const spec of catalog.stamps) {
    const record = earnStamp(spec, ctx, aggregated, labelVars);
    if (record) earned.push(record);
  }

  const existingByKey = new Map(existing.map((s) => [s.key, s]));
  const earnedKeys = new Set(earned.map((e) => e.key));

  const awarded = earned.filter((e) => {
    const prior = existingByKey.get(e.key);
    if (!prior) return true;
    if (e.tier !== undefined) return e.tier > (prior.tier ?? 0);
    return false;
  });

  // Only service stamps are revocable, and only when the provider is no longer linked.
  const revoked = existing.filter((ex) => ex.kind === 'service' && !earnedKeys.has(ex.key));

  return { awarded, revoked };
}
