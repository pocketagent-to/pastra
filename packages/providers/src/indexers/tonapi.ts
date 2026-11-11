import { AdapterError, isAdapterError } from '../errors';
import { bearer, httpJson } from '../http';
import type { TonIndexer, TonWalletData } from '../adapters/walletTon';

/**
 * TonAPI (tonapi.io, REST v2) implementation of the `TonIndexer` the TON wallet adapter depends on.
 * It reads only COUNTS and DATES from the account's transaction history — never balances, jettons or
 * transaction amounts (docs/product-spec.md section 14, docs/architecture.md sections 7 and 14).
 *
 * It feeds three catalog metrics plus the `firstTxYear` extra (see packages/providers/src/adapters/
 * walletTon.ts):
 *   - `wallet_ton.age_years`            fractional years since the earliest transaction
 *   - `wallet_ton.tx_count`             number of transactions (capped, see MAX_TX)
 *   - `wallet_ton.active_months_year`   distinct active year-month buckets in the last 12 months
 *
 * The API key is Pastra's own infrastructure credential (env `TONAPI_KEY`), not a per-user token:
 * it is sent as `Authorization: Bearer <apiKey>`. TonAPI allows limited keyless use, but a key is
 * required here for reliable rate limits. A key TonAPI rejects (401/403) is an infrastructure fault,
 * not a wallet-auth fault — there is nothing for the user to reconnect — so it is surfaced as
 * `provider_down` rather than `auth_expired`.
 */

const BASE_URL = 'https://tonapi.io/v2';

/** Transactions per page. TonAPI caps this endpoint at 1000. */
const PAGE_LIMIT = 1000;

/**
 * Hard ceiling on transactions we fetch. It matches metrics.csv "Число транзакций" Порог 100 (3000):
 * past this point `wallet_ton.tx_count` is already at its maximum score, so paging further cannot
 * change any metric. `txCount` is therefore capped at MAX_TX, and for a wallet with more than MAX_TX
 * transactions `ageYears`/`firstTxYear` reflect the oldest transaction WITHIN this most-recent
 * window (we page newest-first), which may under-report true wallet age.
 */
const MAX_TX = 3000;

const DAY_MS = 24 * 60 * 60 * 1000;
/** Average year length, so fractional ages account for leap years. */
const YEAR_MS = 365.25 * DAY_MS;
/** Window for "active months in the last year". */
const ACTIVE_WINDOW_MS = 365 * DAY_MS;
/** A calendar year has at most 12 months, and the metric maxes at 12. */
const MAX_ACTIVE_MONTHS = 12;

/** One transaction as returned by TonAPI. We read only `lt` (for paging) and `utime` (a date). */
interface TonapiTransaction {
  /** Logical time; used only to page backwards via `before_lt`. Never an amount. */
  lt?: number;
  /** Unix seconds of the transaction. */
  utime?: number;
}

interface TonapiTransactionsResponse {
  transactions?: TonapiTransaction[];
}

/**
 * Fetch one page of transactions, remapping a rejected API key to `provider_down`. The TonAPI key is
 * ours, not the user's, so `auth_expired`/`private_data` here mean our infrastructure is at fault.
 * `rate_limited` and `provider_down` pass through for the core's backoff.
 */
async function fetchPage(
  url: string,
  headers: Record<string, string>,
): Promise<TonapiTransaction[]> {
  let res: TonapiTransactionsResponse;
  try {
    res = await httpJson<TonapiTransactionsResponse>(url, { headers });
  } catch (error) {
    if (isAdapterError(error) && (error.code === 'auth_expired' || error.code === 'private_data')) {
      throw new AdapterError('provider_down', 'TonAPI rejected the API key');
    }
    throw error;
  }
  return res.transactions ?? [];
}

/**
 * Build the TonIndexer backed by TonAPI. `opts.apiKey` is the `TONAPI_KEY` infrastructure credential;
 * when empty we fail fast with `provider_down` rather than relying on anonymous rate limits.
 */
export function createTonapiIndexer(opts: { apiKey: string }): TonIndexer {
  const { apiKey } = opts;

  return {
    async getWalletData(address: string): Promise<TonWalletData> {
      if (!apiKey) {
        throw new AdapterError('provider_down', 'TonAPI key is not configured');
      }

      const headers = bearer(apiKey);
      const path = `${BASE_URL}/blockchain/accounts/${encodeURIComponent(address)}/transactions`;

      // Page newest-first. `before_lt` is exclusive, so each page starts strictly below the smallest
      // logical time of the previous page — no overlap and no duplicates.
      const utimes: number[] = [];
      let txCount = 0;
      let beforeLt: number | undefined;

      while (txCount < MAX_TX) {
        const params = new URLSearchParams({ limit: String(PAGE_LIMIT) });
        if (beforeLt !== undefined) params.set('before_lt', String(beforeLt));

        const txs = await fetchPage(`${path}?${params.toString()}`, headers);
        if (txs.length === 0) break;

        let minLt: number | undefined;
        for (const tx of txs) {
          if (txCount >= MAX_TX) break;
          if (typeof tx.utime === 'number' && Number.isFinite(tx.utime)) {
            utimes.push(tx.utime);
          }
          if (typeof tx.lt === 'number' && Number.isFinite(tx.lt)) {
            minLt = minLt === undefined ? tx.lt : Math.min(minLt, tx.lt);
          }
          txCount += 1;
        }

        // Short page => we reached the account's first transaction. No usable `lt` => cannot page on.
        if (txs.length < PAGE_LIMIT || minLt === undefined) break;
        beforeLt = minLt;
      }

      const now = Date.now();

      // Empty / unused wallet: no first transaction yet.
      if (utimes.length === 0) {
        return {
          ageYears: 0,
          firstTxYear: new Date(now).getUTCFullYear(),
          txCount: 0,
          activeMonthsLastYear: 0,
        };
      }

      const earliestSec = utimes.reduce((min, u) => (u < min ? u : min), Number.POSITIVE_INFINITY);
      const earliestMs = earliestSec * 1000;

      const ageYears = Math.max(0, (now - earliestMs) / YEAR_MS);
      const firstTxYear = new Date(earliestMs).getUTCFullYear();

      // Distinct UTC year-month buckets touched within the last 12 months.
      const cutoffMs = now - ACTIVE_WINDOW_MS;
      const buckets = new Set<string>();
      for (const u of utimes) {
        const ms = u * 1000;
        if (ms < cutoffMs) continue;
        const d = new Date(ms);
        buckets.add(`${d.getUTCFullYear()}-${d.getUTCMonth()}`);
      }
      const activeMonthsLastYear = Math.min(buckets.size, MAX_ACTIVE_MONTHS);

      return { ageYears, firstTxYear, txCount, activeMonthsLastYear };
    },
  };
}
