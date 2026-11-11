import { AdapterError } from '../errors';
import { httpJson } from '../http';
import type { EvmIndexer, EvmWalletData } from '../adapters/walletEvm';

/**
 * Alchemy EVM wallet indexer (docs/architecture.md section 11, docs/product-spec.md section 14).
 *
 * Reads wallet activity across several EVM chains and returns only counts, dates and the list of
 * networks — NEVER balances, token holdings or transfer amounts. Each transfer's `value` /
 * `rawContract` fields are deliberately ignored; we read only `metadata.blockTimestamp` and `hash`,
 * and for NFTs only the `totalCount`.
 *
 * Signals per chain:
 *   - `alchemy_getAssetTransfers` (categories external, erc20, erc721, erc1155), queried both as
 *     `fromAddress` and `toAddress`, ordered ascending so the earliest activity is seen first, and
 *     paginated by `pageKey` up to a per-chain cap. The collected block timestamps drive
 *     `firstTxYear`, `ageYears` and `activeMonthsLastYear`; distinct transaction hashes drive
 *     `txCount`; and a chain contributes to `networks` when any transfer is found.
 *   - NFT API `getNFTsForOwner` → `totalCount`, summed across chains into `nftCount`.
 *
 * A chain that errors is skipped so one bad RPC does not fail the whole wallet; only if every chain
 * fails is an error thrown.
 */

/** Chain name (as used by config `EVM_CHAINS`) → Alchemy network host. */
const CHAIN_HOSTS: Record<string, string> = {
  ethereum: 'eth-mainnet',
  base: 'base-mainnet',
  arbitrum: 'arb-mainnet',
  optimism: 'opt-mainnet',
  polygon: 'polygon-mainnet',
  bnb: 'bnb-mainnet',
  avalanche: 'avax-mainnet',
  zksync: 'zksync-mainnet',
};

const DEFAULT_CHAINS = [
  'ethereum',
  'base',
  'arbitrum',
  'optimism',
  'polygon',
  'bnb',
  'avalanche',
  'zksync',
];

/** Transfer categories we count. Only movement is counted — amounts are never read. */
const TRANSFER_CATEGORIES = ['external', 'erc20', 'erc721', 'erc1155'];

const DAY_MS = 24 * 60 * 60 * 1000;
/** Fractional years use a 365.25-day year so leap years do not skew age. */
const YEAR_MS = 365.25 * DAY_MS;
/** "Last 12 months" window for the active-months bucket count. */
const ACTIVE_WINDOW_MS = 365 * DAY_MS;
/** Alchemy caps a single `getAssetTransfers` page at 1000. */
const PAGE_SIZE = 1000;
/** Per-chain transfer cap (2 pages × 2 directions at most). Bounds requests for very busy wallets. */
const MAX_TRANSFERS_PER_CHAIN = 2000;

interface AssetTransfer {
  hash?: string;
  metadata?: { blockTimestamp?: string };
}

interface AssetTransfersResult {
  transfers?: AssetTransfer[];
  pageKey?: string;
}

interface JsonRpcResponse<T> {
  result?: T;
  error?: { code?: number; message?: string };
}

interface NftOwnerResponse {
  totalCount?: number;
}

interface ChainResult {
  hashes: Set<string>;
  months: Set<string>;
  earliest?: number;
  transferSeen: boolean;
  nftCount: number;
}

/** A `YYYY-M` bucket key (UTC) used to count distinct active months. */
function monthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}`;
}

/**
 * Alchemy EVM indexer. Aggregates wallet activity across `opts.chains` (default: the eight chains
 * above). `apiKey` is the `ALCHEMY_KEY` env value; an empty key throws `provider_down`.
 */
export function createAlchemyEvmIndexer(opts: { apiKey: string; chains?: string[] }): EvmIndexer {
  const apiKey = opts.apiKey;
  const chains = opts.chains && opts.chains.length > 0 ? opts.chains : DEFAULT_CHAINS;

  /**
   * Page `getAssetTransfers` for one direction up to `budget` transfers. Returns the number
   * consumed so the caller can share the cap across both directions. Never reads transfer amounts.
   */
  async function collectTransfers(
    rpcUrl: string,
    address: string,
    key: 'fromAddress' | 'toAddress',
    budget: number,
    handle: (transfer: AssetTransfer) => void,
  ): Promise<number> {
    let consumed = 0;
    let pageKey: string | undefined;
    while (consumed < budget) {
      const pageMax = Math.min(PAGE_SIZE, budget - consumed);
      const params: Record<string, unknown> = {
        [key]: address,
        category: TRANSFER_CATEGORIES,
        order: 'asc',
        withMetadata: true,
        maxCount: `0x${pageMax.toString(16)}`,
      };
      if (pageKey) params.pageKey = pageKey;

      const res = await httpJson<JsonRpcResponse<AssetTransfersResult>>(rpcUrl, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          id: 1,
          jsonrpc: '2.0',
          method: 'alchemy_getAssetTransfers',
          params: [params],
        }),
      });
      if (res.error) {
        throw new AdapterError('unexpected_response', res.error.message ?? 'Alchemy RPC error');
      }

      const transfers = res.result?.transfers ?? [];
      for (const transfer of transfers) {
        handle(transfer);
        consumed += 1;
      }
      pageKey = res.result?.pageKey ?? undefined;
      if (!pageKey || transfers.length === 0) break;
    }
    return consumed;
  }

  /** NFT API owner count for one chain. Reads `totalCount` only (no metadata, no balances). */
  async function fetchNftCount(host: string, address: string): Promise<number> {
    const url =
      `https://${host}.g.alchemy.com/nft/v3/${apiKey}/getNFTsForOwner` +
      `?owner=${encodeURIComponent(address)}&withMetadata=false&pageSize=1`;
    const res = await httpJson<NftOwnerResponse>(url);
    return typeof res.totalCount === 'number' ? res.totalCount : 0;
  }

  /** Gather all signals for one chain, or throw so the caller can skip it. */
  async function processChain(
    chain: string,
    address: string,
    cutoff: number,
  ): Promise<ChainResult> {
    const host = CHAIN_HOSTS[chain];
    if (!host) throw new AdapterError('unexpected_response', `Unknown EVM chain: ${chain}`);
    const rpcUrl = `https://${host}.g.alchemy.com/v2/${apiKey}`;

    const hashes = new Set<string>();
    const months = new Set<string>();
    let earliest: number | undefined;
    let transferSeen = false;

    const handle = (transfer: AssetTransfer): void => {
      transferSeen = true;
      if (transfer.hash) hashes.add(transfer.hash);
      const iso = transfer.metadata?.blockTimestamp;
      if (!iso) return;
      const ms = Date.parse(iso);
      if (Number.isNaN(ms)) return;
      if (earliest === undefined || ms < earliest) earliest = ms;
      if (ms >= cutoff) months.add(monthKey(ms));
    };

    let budget = MAX_TRANSFERS_PER_CHAIN;
    budget -= await collectTransfers(rpcUrl, address, 'fromAddress', budget, handle);
    if (budget > 0) {
      await collectTransfers(rpcUrl, address, 'toAddress', budget, handle);
    }

    // The NFT API is secondary and unsupported on some chains; a failure here contributes 0 rather
    // than discarding this chain's transfer data.
    let nftCount = 0;
    try {
      nftCount = await fetchNftCount(host, address);
    } catch {
      nftCount = 0;
    }

    return { hashes, months, earliest, transferSeen, nftCount };
  }

  return {
    async getWalletData(address: string): Promise<EvmWalletData> {
      if (!apiKey) {
        throw new AdapterError('provider_down', 'Alchemy API key is not configured');
      }

      const now = Date.now();
      const cutoff = now - ACTIVE_WINDOW_MS;

      const hashes = new Set<string>();
      const months = new Set<string>();
      let earliest: number | undefined;
      let networks = 0;
      let nftCount = 0;
      let failures = 0;

      for (const chain of chains) {
        try {
          const chainResult = await processChain(chain, address, cutoff);
          for (const hash of chainResult.hashes) hashes.add(hash);
          for (const month of chainResult.months) months.add(month);
          if (
            chainResult.earliest !== undefined &&
            (earliest === undefined || chainResult.earliest < earliest)
          ) {
            earliest = chainResult.earliest;
          }
          if (chainResult.transferSeen) networks += 1;
          nftCount += chainResult.nftCount;
        } catch {
          failures += 1;
        }
      }

      if (failures === chains.length) {
        throw new AdapterError('provider_down', 'All EVM chains failed');
      }

      const firstTxYear =
        earliest !== undefined
          ? new Date(earliest).getUTCFullYear()
          : new Date(now).getUTCFullYear();
      const ageYears = earliest !== undefined ? (now - earliest) / YEAR_MS : 0;

      return {
        ageYears,
        firstTxYear,
        txCount: hashes.size,
        activeMonthsLastYear: months.size,
        networks,
        nftCount,
      };
    },
  };
}
