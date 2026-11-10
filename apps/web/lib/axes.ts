import type { Axis } from '@pastra/catalog';

/** Display names for the six axes (docs/product-spec.md section 2). */
export const AXIS_LABEL: Record<Axis, string> = {
  sports: 'Sports',
  gaming: 'Gaming',
  crypto: 'Crypto',
  music: 'Music & Entertainment',
  social: 'Social',
  lifestyle: 'Lifestyle',
};

/** Short labels for the hexagon vertices, where space is tight. */
export const AXIS_SHORT: Record<Axis, string> = {
  sports: 'Sports',
  gaming: 'Gaming',
  crypto: 'Crypto',
  music: 'Music',
  social: 'Social',
  lifestyle: 'Lifestyle',
};
