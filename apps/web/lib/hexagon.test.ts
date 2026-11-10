import { describe, expect, it } from 'vitest';
import { HEX_AXIS_ORDER, hexPolygon, hexVertex } from './hexagon';

describe('hexagon geometry (docs/architecture.md section 13)', () => {
  it('orders axes clockwise from the top: Sports first', () => {
    expect(HEX_AXIS_ORDER[0]).toBe('sports');
    expect(HEX_AXIS_ORDER[1]).toBe('gaming');
    expect(HEX_AXIS_ORDER[5]).toBe('lifestyle');
  });

  it('places Gaming (index 1) at value 94 near (85.5, -49.4)', () => {
    const { x, y } = hexVertex(1, 94);
    expect(x).toBeCloseTo(85.5, 1);
    expect(y).toBeCloseTo(-49.4, 1);
  });

  it('puts Sports (index 0, top) straight up', () => {
    const { x, y } = hexVertex(0, 100);
    expect(x).toBeCloseTo(0, 6);
    expect(y).toBeCloseTo(-105, 6);
  });

  it('keeps a non-zero axis visible and collapses a zero axis to the centre', () => {
    const points = hexPolygon([0, 1, 0, 0, 0, 0]).split(' ');
    expect(points[0]).toBe('0,0'); // zero axis at centre
    // Gaming at value 1 is lifted to the minimum visible radius (~6px), not 1% of R.
    const [gx, gy] = (points[1] ?? '').split(',').map(Number);
    expect(Math.hypot(gx ?? 0, gy ?? 0)).toBeGreaterThanOrEqual(5.9);
  });
});
