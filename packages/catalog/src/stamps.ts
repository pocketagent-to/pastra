import type { StampSpec } from './types';

/**
 * Achievement stamps (docs/product-spec.md section 6.9). Service stamps (one per connectable
 * provider, revoked on disconnect) are generated from the provider list in `catalog.ts`.
 *
 * `crypto.nfts_total` is a derived metric: the summed NFT count across all connected wallets.
 * The scoring package computes it into the condition context.
 */
export const ACHIEVEMENT_STAMPS: StampSpec[] = [
  {
    key: 'in_crypto_since',
    axis: 'crypto',
    kind: 'achievement',
    label: 'In crypto since {year}',
    condition: {
      kind: 'any',
      of: [
        { kind: 'connected', provider: 'wallet_evm' },
        { kind: 'connected', provider: 'wallet_solana' },
        { kind: 'connected', provider: 'wallet_ton' },
      ],
    },
  },
  {
    key: 'collector',
    axis: 'crypto',
    kind: 'achievement',
    label: 'Collector',
    condition: { kind: 'metric_gte', metric: 'crypto.nfts_total', value: 50 },
  },
  {
    key: 'steam_hours',
    axis: 'gaming',
    kind: 'achievement',
    label: '{tier}+ hours',
    tierMetric: 'steam.hours_total',
    tiers: [
      { tier: 500, value: 500, label: '500+ hours' },
      { tier: 1000, value: 1000, label: '1,000+ hours' },
      { tier: 2000, value: 2000, label: '2,000+ hours' },
      { tier: 5000, value: 5000, label: '5,000+ hours' },
    ],
  },
  {
    key: 'marathoner',
    axis: 'sports',
    kind: 'achievement',
    label: 'Marathoner',
    condition: {
      kind: 'any',
      of: [
        { kind: 'metric_gte', metric: 'polar.weeks_streak', value: 12 },
        { kind: 'metric_gte', metric: 'withings.weeks_streak', value: 12 },
        { kind: 'metric_gte', metric: 'whoop.weeks_streak', value: 12 },
        { kind: 'metric_gte', metric: 'oura.weeks_streak', value: 12 },
      ],
    },
  },
  {
    key: 'traveler',
    axis: 'lifestyle',
    kind: 'achievement',
    label: 'Traveler',
    condition: { kind: 'metric_gte', metric: 'foursquare.countries', value: 10 },
  },
  {
    key: 'explorer',
    axis: 'music',
    kind: 'achievement',
    label: 'Explorer',
    condition: { kind: 'metric_gte', metric: 'tidal.artists', value: 500 },
  },
  {
    key: '10k_club',
    axis: 'social',
    kind: 'achievement',
    label: '10K club',
    condition: {
      kind: 'any',
      of: [
        { kind: 'metric_gte', metric: 'x.followers', value: 10000 },
        { kind: 'metric_gte', metric: 'farcaster.followers', value: 10000 },
      ],
    },
  },
  {
    key: 'full_hexagon',
    axis: 'all',
    kind: 'achievement',
    label: 'Full hexagon',
    condition: { kind: 'all_axes_positive' },
  },
  {
    key: 'level_10',
    axis: 'all',
    kind: 'achievement',
    label: 'Level 10',
    condition: { kind: 'level_gte', value: 10 },
  },
  {
    key: 'level_25',
    axis: 'all',
    kind: 'achievement',
    label: 'Level 25',
    condition: { kind: 'level_gte', value: 25 },
  },
  {
    key: 'level_40',
    axis: 'all',
    kind: 'achievement',
    label: 'Level 40',
    condition: { kind: 'level_gte', value: 40 },
  },
  {
    key: 'first_friend',
    axis: 'all',
    kind: 'achievement',
    label: 'First friend',
    condition: { kind: 'rewarded_friends_gte', value: 1 },
  },
  {
    key: 'card_holder',
    axis: 'all',
    kind: 'achievement',
    label: 'Card holder',
    condition: { kind: 'has_card' },
  },
];

/** Derived metric key: summed NFT count across all connected wallets. */
export const DERIVED_NFTS_TOTAL = 'crypto.nfts_total';
