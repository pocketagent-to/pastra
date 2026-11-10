import type { ProviderId } from '@pastra/catalog';

/**
 * Map a provider id to its logo file in `public/logos`. `card_spend` has no third-party logo and
 * uses the Pastra mark instead (docs/product-spec.md "Расхождения макета и спецификации").
 */
export const LOGO_FILE: Partial<Record<ProviderId, string>> = {
  steam: 'steam.png',
  twitch: 'twitch.png',
  faceit: 'faceit.png',
  battlenet: 'battle-net.png',
  lichess: 'lichess.png',
  osu: 'osu.png',
  wallet_evm: 'evm-wallet.png',
  wallet_solana: 'solana-wallet.png',
  wallet_ton: 'ton-wallet.png',
  x: 'x.png',
  discord: 'discord.png',
  telegram: 'telegram.png',
  farcaster: 'farcaster.png',
  github: 'github.png',
  linkedin: 'linkedin.png',
  tidal: 'tidal.png',
  apple_music: 'apple-music.png',
  youtube: 'youtube.png',
  anilist: 'anilist.png',
  myanimelist: 'myanimelist.png',
  polar: 'polar.png',
  withings: 'withings.png',
  whoop: 'whoop.png',
  oura: 'oura.png',
  foursquare: 'foursquare.png',
};

export function logoSrc(provider: ProviderId): string | null {
  const file = LOGO_FILE[provider];
  return file ? `/logos/${file}` : null;
}
