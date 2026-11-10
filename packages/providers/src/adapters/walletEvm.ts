import { getAddress, isAddress, verifyMessage } from 'viem';
import { AdapterError } from '../errors';
import type {
  BeginContext,
  BeginResult,
  CompleteContext,
  CompleteResult,
  FetchContext,
  FetchResult,
  ProviderAdapter,
} from '../types';

/**
 * Wallet metrics from a blockchain indexer. Only counts and dates are read — never balances or
 * transaction amounts (docs/product-spec.md section 14, docs/architecture.md section 14).
 */
export interface EvmWalletData {
  ageYears: number;
  firstTxYear: number;
  txCount: number;
  activeMonthsLastYear: number;
  networks: number;
  nftCount: number;
}

export interface EvmIndexer {
  getWalletData(address: string): Promise<EvmWalletData>;
}

/** The SIWE-style message a user signs to prove wallet ownership. */
export function buildWalletMessage(domain: string, nonce: string): string {
  return [
    `${domain} wants you to verify ownership of this wallet for Pastra.`,
    '',
    'This request will not trigger a blockchain transaction or cost gas.',
    `Nonce: ${nonce}`,
  ].join('\n');
}

/**
 * EVM wallet adapter (reference implementation). Verifies a message signature for ownership and
 * reads wallet metrics from an injected indexer (e.g. Alchemy). No OAuth tokens.
 */
export function createEvmWalletAdapter(opts: {
  domain: string;
  indexer: EvmIndexer;
}): ProviderAdapter {
  return {
    id: 'wallet_evm',
    auth: 'wallet_signature',

    async begin(ctx: BeginContext): Promise<BeginResult> {
      return { messageToSign: buildWalletMessage(opts.domain, ctx.nonce ?? ctx.state) };
    },

    async complete(ctx: CompleteContext): Promise<CompleteResult> {
      const { address, signature, message } = ctx.params;
      if (!address || !signature || !message || !isAddress(address)) {
        throw new AdapterError('unexpected_response', 'Missing or invalid wallet proof');
      }
      let valid = false;
      try {
        valid = await verifyMessage({ address, message, signature: signature as `0x${string}` });
      } catch {
        valid = false;
      }
      if (!valid) throw new AdapterError('unexpected_response', 'Signature does not match address');
      // Normalise to a checksum address; the external id is the lowercase address.
      return { externalId: getAddress(address).toLowerCase() };
    },

    async fetch(ctx: FetchContext): Promise<FetchResult> {
      let data: EvmWalletData;
      try {
        data = await opts.indexer.getWalletData(ctx.externalId);
      } catch (error) {
        throw new AdapterError('provider_down', `Indexer failed: ${(error as Error).message}`);
      }
      return {
        metrics: {
          'wallet_evm.age_years': data.ageYears,
          'wallet_evm.tx_count': data.txCount,
          'wallet_evm.active_months_year': data.activeMonthsLastYear,
          'wallet_evm.networks': data.networks,
          'wallet_evm.nfts': data.nftCount,
        },
        extras: { firstTxYear: data.firstTxYear },
      };
    },
  };
}
