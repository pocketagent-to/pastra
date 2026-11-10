/** Clamp a value to the 0–100 range; +/-Infinity map to 100/0, NaN maps to 0. */
export function clamp100(value: number): number {
  if (Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** Round to one decimal place (metric and service scores). */
export function round1(value: number): number {
  return Math.round((value + Number.EPSILON) * 10) / 10;
}

/** Round to the nearest integer (axis scores). */
export function roundInt(value: number): number {
  return Math.round(value + Number.EPSILON);
}
