import type { MetricSpec } from '@pastra/catalog';
import { clamp100, round1 } from './round';

/**
 * Score a single metric value against its thresholds (docs/product-spec.md section 6.1).
 *
 * - Log scale: `100 * ln(v / t0) / ln(t100 / t0)`.
 * - Linear scale: `100 * (v - t0) / (t100 - t0)`.
 * - A reverse scale (e.g. osu! world rank) is the same formula with `t0 > t100`.
 * - The result is clamped to 0–100 and rounded to one decimal.
 */
export function scoreMetric(
  value: number,
  spec: Pick<MetricSpec, 'scale' | 't0' | 't100'>,
): number {
  const { scale, t0, t100 } = spec;
  let raw: number;
  if (scale === 'linear') {
    raw = (100 * (value - t0)) / (t100 - t0);
  } else {
    // Non-positive values on a log scale fall outside the domain; clamp handles the infinities.
    raw = (100 * Math.log(value / t0)) / Math.log(t100 / t0);
  }
  return round1(clamp100(raw));
}
