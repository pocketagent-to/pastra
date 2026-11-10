import type { Axis } from '@pastra/catalog';

/**
 * The example data set from the spec (nomad, week 46). Stage 3 renders every screen on this seed
 * (docs/architecture.md section 16, 17). The data layer returns this today; real `core` reads plug
 * in behind the same shape as the app is wired to a live database.
 */
export interface ExampleAxis {
  score: number;
  delta: number;
  topPct: number | null;
  visibility: 'everyone' | 'friends' | 'me';
}

export const EXAMPLE_HANDLE = 'nomad';
export const EXAMPLE_WEEK = '2026-W46';
export const EXAMPLE_NEXT_DROP = '2026-11-16T12:00:00Z';

export const EXAMPLE_AXES: Record<Axis, ExampleAxis> = {
  sports: { score: 34, delta: 0, topPct: null, visibility: 'me' },
  gaming: { score: 94, delta: 3, topPct: 6, visibility: 'everyone' },
  crypto: { score: 88, delta: 1, topPct: 12, visibility: 'everyone' },
  music: { score: 52, delta: 0, topPct: 48, visibility: 'everyone' },
  social: { score: 61, delta: -2, topPct: 39, visibility: 'everyone' },
  lifestyle: { score: 27, delta: 4, topPct: null, visibility: 'everyone' },
};

export const EXAMPLE_PASS = {
  handle: EXAMPLE_HANDLE,
  displayName: 'Nomad',
  bio: 'Collecting hours, chains and check-ins.',
  week: EXAMPLE_WEEK,
  level: 27,
  points: 391,
  rarity: 'rare' as const,
  title: 'Gamer & crypto veteran',
  nextDropAt: EXAMPLE_NEXT_DROP,
  serverNow: '2026-11-13T21:51:00Z',
  axes: EXAMPLE_AXES,
  keyNumbers: [
    { provider: 'steam' as const, axis: 'gaming' as Axis, value: '2,140', label: 'hours in CS2' },
    { provider: 'wallet_evm' as const, axis: 'crypto' as Axis, value: '7', label: 'yrs in crypto' },
    {
      provider: 'github' as const,
      axis: 'social' as Axis,
      value: '1.2K',
      label: 'followers + stars',
    },
    { provider: 'tidal' as const, axis: 'music' as Axis, value: '480', label: 'tracks' },
  ],
  stamps: [
    { key: 'steam_hours', label: '2,000+ hours', axis: 'gaming' as Axis, isNew: true },
    { key: 'in_crypto_since', label: 'In crypto since 2019', axis: 'crypto' as Axis, isNew: false },
    { key: 'full_hexagon', label: 'Full hexagon', axis: 'all' as const, isNew: false },
  ],
  stale: [{ provider: 'tidal' as const, dataWeek: '2026-W45' }],
};

export function axesValues(): Record<Axis, number> {
  return {
    sports: EXAMPLE_AXES.sports.score,
    gaming: EXAMPLE_AXES.gaming.score,
    crypto: EXAMPLE_AXES.crypto.score,
    music: EXAMPLE_AXES.music.score,
    social: EXAMPLE_AXES.social.score,
    lifestyle: EXAMPLE_AXES.lifestyle.score,
  };
}

export const EXAMPLE_OFFERS = [
  {
    id: 'o1',
    merchant: '[PARTNER A]',
    headline: '8% back',
    axis: 'gaming' as Axis,
    reason: 'Because you played 18 hours of CS2 this week',
    endsLabel: 'Ends Monday',
    type: 'cashback' as const,
    state: 'available' as const,
  },
  {
    id: 'o2',
    merchant: '[PARTNER B]',
    headline: '[RATE]',
    axis: 'crypto' as Axis,
    reason: 'Because your Crypto side is Top 12%',
    endsLabel: 'Ends Monday',
    type: 'cashback' as const,
    state: 'locked' as const,
  },
  {
    id: 'o3',
    merchant: '[PARTNER C]',
    headline: '[CODE]',
    axis: 'music' as Axis,
    reason: 'Because you love music',
    endsLabel: 'Ends Monday',
    type: 'promo' as const,
    state: 'available' as const,
  },
];

export const EXAMPLE_FRIENDS = [
  { handle: 'kira', level: 22, lead: 'You lead in 4 of 6 sides' },
  { handle: 'volt', level: 19, lead: 'Leads you in 2 of 6 sides' },
  { handle: 'mara', level: 15, lead: 'You lead in 5 of 6 sides' },
];

export const EXAMPLE_CARD = {
  status: 'active' as const,
  last4: '4921',
  balance: '128.40',
  currency: 'USD',
  boosts: 2,
  weeklyCashback: '3.84',
  recent: [
    { merchant: 'Acme', amount: '24.00', cashback: '1.92', at: 'Today' },
    { merchant: '[PARTNER A]', amount: '12.00', cashback: '0.96', at: 'Yesterday' },
    { merchant: 'Corner Store', amount: '8.40', at: 'Mon' },
  ],
};
