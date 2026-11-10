import { clamp100, roundInt } from './round';

/** Fraction of each non-best service score that still contributes to an axis. */
export const SECONDARY_WEIGHT = 0.1;

/**
 * Score an axis from its service scores (docs/product-spec.md section 6.3): the best score plus
 * 10% of every other, plus fixed bonuses (Telegram/LinkedIn +5 Social, ENS +5 Crypto), clamped to
 * 100 and rounded to an integer. Bonus-only providers contribute through `bonus`, not the list.
 */
export function scoreAxis(serviceScores: number[], bonus = 0): number {
  if (serviceScores.length === 0 && bonus === 0) return 0;
  const sorted = [...serviceScores].sort((a, b) => b - a);
  const best = sorted[0] ?? 0;
  const rest = sorted.slice(1).reduce((sum, score) => sum + score, 0);
  return roundInt(clamp100(best + SECONDARY_WEIGHT * rest + bonus));
}

/** The contribution each service makes to its axis: full score for the best, 10% for the rest. */
export function axisContributions(serviceScores: number[]): number[] {
  if (serviceScores.length === 0) return [];
  const order = serviceScores
    .map((score, index) => ({ score, index }))
    .sort((a, b) => b.score - a.score);
  const contributions = new Array<number>(serviceScores.length).fill(0);
  order.forEach((entry, rank) => {
    contributions[entry.index] = rank === 0 ? entry.score : SECONDARY_WEIGHT * entry.score;
  });
  return contributions;
}
