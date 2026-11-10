import { describe, expect, it } from 'vitest';
import { scoreMetric } from '@pastra/scoring';

describe('scoreMetric (docs/product-spec.md section 6.1)', () => {
  const steamHours = { scale: 'log', t0: 10, t100: 5000 } as const;

  it('clamps a value below t0 to 0 and above t100 to 100', () => {
    expect(scoreMetric(5, steamHours)).toBe(0);
    expect(scoreMetric(6000, steamHours)).toBe(100);
  });

  it('scores the threshold endpoints exactly', () => {
    expect(scoreMetric(10, steamHours)).toBe(0);
    expect(scoreMetric(5000, steamHours)).toBe(100);
  });

  it('places the geometric midpoint of a log scale at 50', () => {
    expect(scoreMetric(100, { scale: 'log', t0: 10, t100: 1000 })).toBe(50);
  });

  it('scores a linear scale proportionally', () => {
    expect(scoreMetric(50, { scale: 'linear', t0: 0, t100: 100 })).toBe(50);
    expect(scoreMetric(7, { scale: 'linear', t0: 1, t100: 10 })).toBeCloseTo(66.7, 1);
  });

  it('handles a reverse scale (osu! world rank) where smaller is better', () => {
    const rank = { scale: 'log', t0: 1_000_000, t100: 1000 } as const;
    expect(scoreMetric(1000, rank)).toBe(100);
    expect(scoreMetric(1_000_000, rank)).toBe(0);
    // A rank better than the t100 threshold still clamps to 100.
    expect(scoreMetric(500, rank)).toBe(100);
  });
});
