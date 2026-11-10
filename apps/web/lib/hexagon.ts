import type { Axis } from '@pastra/catalog';

/**
 * Hexagon geometry (docs/architecture.md section 13).
 *
 * viewBox="-180 -150 360 300", radius R = 105, three grid rings at 35 / 70 / 105. Axes run
 * clockwise from the top vertex: Sports, Gaming, Crypto, Music, Social, Lifestyle. The vertex of
 * axis `i` at value `s` (0–100) is:
 *   x = R * (s/100) * sin(60deg * i)
 *   y = -R * (s/100) * cos(60deg * i)
 * A non-zero axis is drawn at a minimum radius so the shape never collapses to a line.
 */
export const HEX_R = 105;
export const HEX_RINGS = [35, 70, 105] as const;
export const HEX_VIEWBOX = '-180 -150 360 300';
export const HEX_MIN_VISIBLE = 6;

/** Axis order around the hexagon, clockwise from the top. */
export const HEX_AXIS_ORDER: readonly Axis[] = [
  'sports',
  'gaming',
  'crypto',
  'music',
  'social',
  'lifestyle',
];

const DEG = Math.PI / 180;

export interface Point {
  x: number;
  y: number;
}

/** The vertex for axis index `i` (0 = Sports at the top) at value `s` (0–100), at radius `r`. */
export function hexVertex(i: number, s: number, r: number = HEX_R): Point {
  const frac = Math.max(0, Math.min(100, s)) / 100;
  return {
    x: r * frac * Math.sin(60 * i * DEG),
    y: -r * frac * Math.cos(60 * i * DEG),
  };
}

/** A grid-ring vertex (full value) for axis index `i` at ring radius `r`. */
export function ringVertex(i: number, r: number): Point {
  return { x: r * Math.sin(60 * i * DEG), y: -r * Math.cos(60 * i * DEG) };
}

/** The six value vertices as an SVG `points` string, applying the minimum visible radius. */
export function hexPolygon(values: number[]): string {
  return values
    .map((s, i) => {
      const value = s <= 0 ? 0 : Math.max(s, (HEX_MIN_VISIBLE / HEX_R) * 100);
      const { x, y } = hexVertex(i, value);
      return `${round(x)},${round(y)}`;
    })
    .join(' ');
}

/** A grid ring polygon as an SVG `points` string. */
export function ringPolygon(r: number): string {
  return Array.from({ length: 6 }, (_, i) => {
    const { x, y } = ringVertex(i, r);
    return `${round(x)},${round(y)}`;
  }).join(' ');
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
