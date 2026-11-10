import type { Axis, TitleWords } from './types';

/** Title words per axis (docs/product-spec.md section 6.6). */
export const TITLE_WORDS: Record<Axis, TitleWords> = {
  sports: { primary: 'Athlete', secondary: 'athlete' },
  gaming: { primary: 'Gamer', secondary: 'gamer' },
  crypto: { primary: 'Crypto veteran', secondary: 'crypto veteran' },
  music: { primary: 'Music fan', secondary: 'music fan' },
  social: { primary: 'Connector', secondary: 'connector' },
  lifestyle: { primary: 'Adventurer', secondary: 'adventurer' },
};

/** Tie-break order when two axes are equal (docs/product-spec.md section 6.6). */
export const TITLE_TIE_ORDER: readonly Axis[] = [
  'gaming',
  'crypto',
  'social',
  'music',
  'sports',
  'lifestyle',
];
