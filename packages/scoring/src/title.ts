import type { Axis, Catalog } from '@pastra/catalog';
import { AXES } from '@pastra/catalog';
import type { Rarity } from './types';

/** Axes sorted by score descending, ties broken by the catalog's title tie-break order. */
export function sortAxesByStrength(axes: Record<Axis, number>, catalog: Catalog): Axis[] {
  const rank = new Map(catalog.titleTieOrder.map((axis, index) => [axis, index]));
  return [...AXES].sort((a, b) => {
    if (axes[b] !== axes[a]) return axes[b] - axes[a];
    return (rank.get(a) ?? 0) - (rank.get(b) ?? 0);
  });
}

/**
 * Build the title from the strongest axis, adding the runner-up when it scores 60+
 * (docs/product-spec.md section 6.6). Below 20 on the strongest axis the title is "Newcomer".
 */
export function computeTitle(axes: Record<Axis, number>, catalog: Catalog): string {
  const [first, second] = sortAxesByStrength(axes, catalog);
  if (first === undefined || axes[first] < 20) return 'Newcomer';
  let title = catalog.titleWords[first].primary;
  if (second !== undefined && axes[second] >= 60) {
    title += ` & ${catalog.titleWords[second].secondary}`;
  }
  return title;
}

/** Card rarity by level (docs/product-spec.md section 6.5). */
export function computeRarity(level: number): Rarity {
  if (level >= 40) return 'legendary';
  if (level >= 30) return 'epic';
  if (level >= 20) return 'rare';
  if (level >= 10) return 'uncommon';
  return 'common';
}

/**
 * "Top N%" for an axis (docs/product-spec.md section 6.7). At launch it is `max(1, 100 - score)`;
 * once an axis has a percentile ladder (1,000+ non-zero users) the real percentile is used.
 * Returned only when 50% or better, otherwise `null`.
 */
export function computeTopPct(score: number, percentiles?: number[]): number | null {
  let top: number;
  if (percentiles && percentiles.length >= 1000) {
    const below = percentiles.filter((p) => p < score).length;
    top = Math.max(1, Math.round(100 - (below / percentiles.length) * 100));
  } else {
    top = Math.max(1, 100 - score);
  }
  return top <= 50 ? top : null;
}
