import type { AxisPart, MetricKey, ProviderSpec } from '@pastra/catalog';
import { scoreMetric } from './metric';
import { round1 } from './round';

/** Part weights (docs/formula.csv): Volume 0.40, Activity 0.35, Depth 0.25. */
export const PART_WEIGHTS: Record<AxisPart, number> = {
  volume: 0.4,
  activity: 0.35,
  depth: 0.25,
};

/** Per-week Activity decay when a connection misses refreshes (docs/product-spec.md section 6.4). */
export const ACTIVITY_DECAY = 0.8;

export type PartScores = Record<AxisPart, number | null>;

/**
 * Aggregate the metric values of several connections of one provider: sums by default, max for
 * age/months/networks metrics (docs/product-spec.md section 5). `null` values are skipped.
 */
export function aggregateMetrics(
  connections: Array<{ metrics: Record<MetricKey, number | null> }>,
  provider: ProviderSpec,
): Record<MetricKey, number> {
  const out: Record<MetricKey, number> = {};
  for (const metric of provider.metrics) {
    const mode = metric.aggregate ?? 'sum';
    let acc: number | undefined;
    for (const conn of connections) {
      const v = conn.metrics[metric.key];
      if (v === null || v === undefined) continue;
      acc = acc === undefined ? v : mode === 'max' ? Math.max(acc, v) : acc + v;
    }
    if (acc !== undefined) out[metric.key] = acc;
  }
  return out;
}

/**
 * Score each part of a service from its aggregated metrics: a part is the mean of its present
 * metric scores, and the Activity part is then multiplied by `0.8^staleWeeks`. A part with no
 * present metric is `null` (its weight is redistributed in {@link combineParts}).
 */
export function scoreParts(
  aggregated: Record<MetricKey, number>,
  provider: ProviderSpec,
  staleWeeks = 0,
): PartScores {
  const buckets: Record<AxisPart, number[]> = { volume: [], activity: [], depth: [] };
  for (const metric of provider.metrics) {
    const value = aggregated[metric.key];
    if (value === undefined) continue;
    buckets[metric.part].push(scoreMetric(value, metric));
  }

  const mean = (xs: number[]): number | null =>
    xs.length === 0 ? null : xs.reduce((a, b) => a + b, 0) / xs.length;

  const decay = ACTIVITY_DECAY ** Math.max(0, staleWeeks);
  const activity = mean(buckets.activity);
  return {
    volume: mean(buckets.volume),
    activity: activity === null ? null : activity * decay,
    depth: mean(buckets.depth),
  };
}

/**
 * Combine part scores into a service score: `0.40*V + 0.35*A + 0.25*D`, with the weights of any
 * absent part redistributed over the present ones, capped by `scoreCap` (X = 80) and rounded to
 * one decimal. A service with no present part scores 0.
 */
export function combineParts(parts: PartScores, scoreCap?: number): number {
  const present = (Object.entries(parts) as Array<[AxisPart, number | null]>).filter(
    (entry): entry is [AxisPart, number] => entry[1] !== null,
  );
  if (present.length === 0) return 0;

  const weightSum = present.reduce((sum, [part]) => sum + PART_WEIGHTS[part], 0);
  let score = present.reduce(
    (sum, [part, value]) => sum + (PART_WEIGHTS[part] / weightSum) * value,
    0,
  );
  if (scoreCap !== undefined) score = Math.min(score, scoreCap);
  return round1(score);
}

/** The display parts (post-decay, one decimal) for the Category screen. */
export function displayParts(parts: PartScores): PartScores {
  return {
    volume: parts.volume === null ? null : round1(parts.volume),
    activity: parts.activity === null ? null : round1(parts.activity),
    depth: parts.depth === null ? null : round1(parts.depth),
  };
}
