import { AdapterError } from '../errors';
import { httpJson } from '../http';
import type { SolanaIndexer, SolanaWalletData } from '../adapters/walletSolana';

/**
 * Helius-backed Solana indexer for `createSolanaWalletAdapter`. Reads only counts and dates — never
 * balances, token holdings or transaction amounts (docs/product-spec.md section 14,
 * docs/architecture.md sections 7 and 14).
 *
 * Everything goes through the single Helius RPC URL `https://mainnet.helius-rpc.com/?api-key=...`:
 *   - `getSignaturesForAddress` (JSON-RPC) for `txCount`, `ageYears`, `firstTxYear` and
 *     `activeMonthsLastYear` — paginated newest-first via `before`, capped at MAX_SIGNATURES.
 *   - `searchAssets` (DAS API, `tokenType: 'nonFungible'`) for `nftCount` via the result `total`,
 *     falling back to a capped page-and-count when `total` is absent.
 *
 * Caveat: because signatures are paginated newest-first and capped, for a wallet with more than
 * MAX_SIGNATURES transactions the "earliest" blockTime is the oldest within the capped window, not
 * the wallet's true first transaction. `ageYears`, `firstTxYear` and `activeMonthsLastYear` are
 * therefore lower bounds for such very active wallets; `txCount` is capped at MAX_SIGNATURES.
 */

const HELIUS_RPC_BASE = 'https://mainnet.helius-rpc.com/';

/** Cap on signatures walked back through history (docs cap "e.g. 2000"). */
const MAX_SIGNATURES = 2000;
/** `getSignaturesForAddress` accepts at most 1000 signatures per page. */
const SIGNATURES_PAGE_LIMIT = 1000;
/** `searchAssets` page size and page cap for the (rare) no-`total` fallback. */
const ASSETS_PAGE_LIMIT = 1000;
const MAX_ASSET_PAGES = 10;

const DAY_MS = 24 * 60 * 60 * 1000;
const MS_PER_YEAR = 365.25 * DAY_MS;
const LAST_YEAR_MS = 365 * DAY_MS;

interface RpcResponse<T> {
  result?: T;
  error?: { code?: number; message?: string };
}

interface SignatureInfo {
  signature?: string;
  blockTime?: number | null;
}

interface SearchAssetsResult {
  total?: number;
  limit?: number;
  page?: number;
  items?: unknown[];
}

/** A single JSON-RPC 2.0 POST to the Helius RPC URL. `httpJson` maps transport/status failures. */
async function rpc<T>(url: string, method: string, params: unknown): Promise<T> {
  const res = await httpJson<RpcResponse<T>>(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: method, method, params }),
  });
  if (res.error) {
    throw new AdapterError('unexpected_response', res.error.message ?? `Helius RPC error for ${method}`);
  }
  if (res.result === undefined) {
    throw new AdapterError('unexpected_response', `Helius RPC returned no result for ${method}`);
  }
  return res.result;
}

/** Walk signatures newest-first via `before`, capped at MAX_SIGNATURES. */
async function collectSignatures(url: string, address: string): Promise<SignatureInfo[]> {
  const all: SignatureInfo[] = [];
  let before: string | undefined;
  while (all.length < MAX_SIGNATURES) {
    const limit = Math.min(SIGNATURES_PAGE_LIMIT, MAX_SIGNATURES - all.length);
    const options: { limit: number; before?: string } = { limit };
    if (before) options.before = before;
    const page = await rpc<SignatureInfo[]>(url, 'getSignaturesForAddress', [address, options]);
    if (!Array.isArray(page) || page.length === 0) break;
    all.push(...page);
    const last = page[page.length - 1];
    if (!last?.signature || page.length < limit) break;
    before = last.signature;
  }
  return all;
}

/** Count non-fungible assets owned by `address` via DAS `searchAssets`. Reads counts only. */
async function countNonFungible(url: string, address: string): Promise<number> {
  const probe = await rpc<SearchAssetsResult>(url, 'searchAssets', {
    ownerAddress: address,
    tokenType: 'nonFungible',
    limit: 1,
  });
  if (typeof probe.total === 'number') return probe.total;

  // Fallback: Helius did not report a total, so page through and count items under a cap.
  let total = 0;
  for (let page = 1; page <= MAX_ASSET_PAGES; page += 1) {
    const res = await rpc<SearchAssetsResult>(url, 'searchAssets', {
      ownerAddress: address,
      tokenType: 'nonFungible',
      limit: ASSETS_PAGE_LIMIT,
      page,
    });
    const items = res.items ?? [];
    total += items.length;
    if (items.length < ASSETS_PAGE_LIMIT) break;
  }
  return total;
}

/**
 * Build a Helius-backed {@link SolanaIndexer}. `apiKey` comes from config (env `HELIUS_KEY`); an
 * empty key throws `provider_down` so wiring fails loudly rather than calling an unauthenticated URL.
 */
export function createHeliusSolanaIndexer(opts: { apiKey: string }): SolanaIndexer {
  const apiKey = opts.apiKey.trim();
  if (!apiKey) {
    throw new AdapterError('provider_down', 'Helius API key is not configured');
  }
  const url = `${HELIUS_RPC_BASE}?api-key=${encodeURIComponent(apiKey)}`;

  return {
    async getWalletData(address: string): Promise<SolanaWalletData> {
      const now = Date.now();

      const signatures = await collectSignatures(url, address);
      const txCount = signatures.length;
      const blockTimes = signatures
        .map((s) => s.blockTime)
        .filter((t): t is number => typeof t === 'number' && t > 0);

      let ageYears = 0;
      let firstTxYear = new Date(now).getUTCFullYear();
      if (blockTimes.length > 0) {
        const earliestMs = Math.min(...blockTimes) * 1000;
        ageYears = Math.max(0, (now - earliestMs) / MS_PER_YEAR);
        firstTxYear = new Date(earliestMs).getUTCFullYear();
      }

      // Distinct year-month buckets with activity in the last 12 months.
      const since = now - LAST_YEAR_MS;
      const months = new Set<string>();
      for (const sec of blockTimes) {
        const ms = sec * 1000;
        if (ms < since) continue;
        const d = new Date(ms);
        months.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
      }
      const activeMonthsLastYear = months.size;

      const nftCount = await countNonFungible(url, address);

      return { ageYears, firstTxYear, txCount, activeMonthsLastYear, nftCount };
    },
  };
}
