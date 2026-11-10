import type { CardProvider } from './provider';
import { MockCardProvider } from './mock';

export interface CardProviderConfig {
  provider: 'mock' | 'wirex';
  wirex?: { apiUrl: string; apiKey: string };
}

/**
 * Build the configured CardProvider. The `wirex` implementation is added in the card stage against
 * the Wirex BaaS sandbox; until then only `mock` is available.
 */
export function createCardProvider(config: CardProviderConfig): CardProvider {
  switch (config.provider) {
    case 'mock':
      return new MockCardProvider();
    case 'wirex':
      throw new Error('The Wirex CardProvider is implemented in the card stage (stage 8).');
  }
}
