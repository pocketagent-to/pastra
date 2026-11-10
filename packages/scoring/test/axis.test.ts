import { describe, expect, it } from 'vitest';
import { scoreAxis } from '@pastra/scoring';

describe('scoreAxis (docs/product-spec.md section 6.3)', () => {
  it('is the best score plus 10% of every other', () => {
    expect(scoreAxis([88, 40, 20])).toBe(94); // 88 + 4 + 2
    expect(scoreAxis([90, 40])).toBe(94); // 90 + 4
  });

  it('order of the services does not matter', () => {
    expect(scoreAxis([20, 88, 40])).toBe(94);
  });

  it('adds a fixed bonus and clamps to 100 (Social 98 + Telegram)', () => {
    expect(scoreAxis([98], 5)).toBe(100);
  });

  it('a bonus-only axis scores just the bonus', () => {
    expect(scoreAxis([], 5)).toBe(5);
  });

  it('a capped X score of 80 is what enters the axis', () => {
    expect(scoreAxis([80])).toBe(80);
  });

  it('is 0 with no services and no bonus', () => {
    expect(scoreAxis([])).toBe(0);
  });
});
