import { createHash, randomUUID } from 'node:crypto';
import type { CardProvider } from './provider';
import { SUPPORTED_COUNTRIES_DEFAULT } from './countries';
import type {
  Balance,
  CardDetails,
  CardStatus,
  CardTx,
  CardWebhookEvent,
  Clock,
  DepositAddresses,
  KycStatus,
  PendingWithdrawal,
  ThreeDsRequest,
} from './types';

interface MockWithdrawal extends PendingWithdrawal {
  createdAt: number;
}

interface MockCustomer {
  customerId: string;
  userAddress: string;
  email: string;
  country: string;
  kyc: KycStatus;
  kycReason?: string;
  card?: CardDetails;
  balance: number;
  currency: 'USD' | 'EUR';
  transactions: CardTx[];
  pending3ds: ThreeDsRequest[];
  withdrawals: MockWithdrawal[];
  deposit: DepositAddresses;
}

const FIVE_MIN = 5 * 60 * 1000;
const WITHDRAWAL_SETTLE_MS = 5000; // mock: sent after 5s (docs/architecture.md section 19)

function money(n: number): string {
  return n.toFixed(2);
}

/**
 * A complete in-memory CardProvider for development and tests. Every interface method works; extra
 * methods (approveKyc, addTransaction, initiate3ds, …) stand in for provider-side events and the
 * admin 3-D Secure button. A fixed clock can be injected for deterministic time-based behaviour.
 */
export class MockCardProvider implements CardProvider {
  readonly #byCustomer = new Map<string, MockCustomer>();
  readonly #byAddress = new Map<string, string>();
  readonly #countries: string[];
  readonly #now: Clock;

  constructor(options: { countries?: string[]; now?: Clock } = {}) {
    this.#countries = options.countries ?? SUPPORTED_COUNTRIES_DEFAULT;
    this.#now = options.now ?? Date.now;
  }

  #require(customerId: string): MockCustomer {
    const c = this.#byCustomer.get(customerId);
    if (!c) throw new Error(`Unknown customer: ${customerId}`);
    return c;
  }

  async supportedCountries(): Promise<string[]> {
    return [...this.#countries];
  }

  async createUser(input: {
    userAddress: string;
    email: string;
    country: string;
  }): Promise<{ customerId: string }> {
    if (!this.#countries.includes(input.country)) {
      throw new Error(`country_not_supported:${input.country}`);
    }
    const existing = this.#byAddress.get(input.userAddress.toLowerCase());
    if (existing) return { customerId: existing };
    const customerId = `cus_${randomUUID()}`;
    const evm = `0xdep${createHash('sha256').update(customerId).digest('hex').slice(0, 37)}`;
    this.#byCustomer.set(customerId, {
      customerId,
      userAddress: input.userAddress,
      email: input.email,
      country: input.country,
      kyc: 'none',
      balance: 0,
      currency: 'USD',
      transactions: [],
      pending3ds: [],
      withdrawals: [],
      deposit: { evm },
    });
    this.#byAddress.set(input.userAddress.toLowerCase(), customerId);
    return { customerId };
  }

  async startKyc(customerId: string): Promise<{ url: string }> {
    const c = this.#require(customerId);
    c.kyc = 'applied';
    return { url: `https://mock-kyc.pastra.test/verify/${customerId}` };
  }

  async getKycStatus(
    customerId: string,
  ): Promise<{ status: KycStatus; reason?: string; canIssueVirtualCard: boolean }> {
    const c = this.#require(customerId);
    return { status: c.kyc, reason: c.kycReason, canIssueVirtualCard: c.kyc === 'approved' };
  }

  async issueVirtualCard(customerId: string): Promise<{ cardId: string; status: CardStatus }> {
    const c = this.#require(customerId);
    if (c.kyc !== 'approved') throw new Error('kyc_not_approved');
    if (c.card && c.card.status !== 'closed')
      return { cardId: c.card.cardId, status: c.card.status };
    const cardId = `card_${randomUUID()}`;
    c.card = {
      cardId,
      status: 'active',
      last4: createHash('sha256')
        .update(cardId)
        .digest('hex')
        .replace(/\D/g, '')
        .slice(0, 4)
        .padEnd(4, '0'),
      expiry: '12/29',
      dailyLimit: null,
      dailyUsage: 0,
      currency: c.currency,
    };
    return { cardId, status: 'active' };
  }

  async getCard(customerId: string): Promise<CardDetails> {
    const c = this.#require(customerId);
    if (!c.card) throw new Error('no_card');
    return { ...c.card };
  }

  async getBalance(customerId: string): Promise<Balance> {
    const c = this.#require(customerId);
    return { available: money(c.balance), currency: c.currency };
  }

  async listTransactions(customerId: string): Promise<{ items: CardTx[]; next?: string }> {
    const c = this.#require(customerId);
    return { items: [...c.transactions].reverse().slice(0, 20) };
  }

  async setFrozen(customerId: string, frozen: boolean): Promise<void> {
    const c = this.#require(customerId);
    if (!c.card) throw new Error('no_card');
    if (c.card.status === 'closed') throw new Error('card_closed');
    c.card.status = frozen ? 'blocked' : 'active';
  }

  async setDailyLimit(customerId: string, amount: number | null): Promise<void> {
    const c = this.#require(customerId);
    if (!c.card || c.card.status !== 'active') throw new Error('card_not_active');
    c.card.dailyLimit = amount;
  }

  async closeCard(customerId: string): Promise<void> {
    const c = this.#require(customerId);
    if (!c.card) throw new Error('no_card');
    if (c.balance > 0) throw new Error('non_zero_balance');
    c.card.status = 'closed';
  }

  async requestActionToken(
    customerId: string,
    _method: 'sms' | 'signature',
  ): Promise<{ token: string; expiresAt: Date }> {
    this.#require(customerId);
    return { token: `act_${randomUUID()}`, expiresAt: new Date(this.#now() + FIVE_MIN) };
  }

  async getDepositAddresses(customerId: string): Promise<DepositAddresses> {
    return { ...this.#require(customerId).deposit };
  }

  async listPendingWithdrawals(customerId: string): Promise<PendingWithdrawal[]> {
    const c = this.#require(customerId);
    for (const w of c.withdrawals) {
      if (w.status === 'sending' && this.#now() - w.createdAt >= WITHDRAWAL_SETTLE_MS)
        w.status = 'sent';
    }
    return c.withdrawals
      .filter((w) => w.status !== 'sent')
      .map(({ createdAt: _createdAt, ...w }) => w);
  }

  async listPending3ds(customerId: string): Promise<ThreeDsRequest[]> {
    const c = this.#require(customerId);
    const now = this.#now();
    c.pending3ds = c.pending3ds.filter((r) => new Date(r.expiresAt).getTime() > now);
    return [...c.pending3ds];
  }

  async resolve3ds(
    customerId: string,
    transactionId: string,
    _decision: 'approve' | 'decline',
  ): Promise<void> {
    const c = this.#require(customerId);
    const before = c.pending3ds.length;
    c.pending3ds = c.pending3ds.filter((r) => r.transactionId !== transactionId);
    if (c.pending3ds.length === before) throw new Error('no_active_request');
  }

  parseWebhook(_path: string, rawBody: string, _sourceIp?: string): CardWebhookEvent {
    try {
      const body = JSON.parse(rawBody) as Record<string, unknown>;
      const type = body.type;
      const customerId = String(body.customerId ?? '');
      switch (type) {
        case 'kyc.updated':
          return {
            type,
            customerId,
            status: body.status as KycStatus,
            reason: body.reason as string | undefined,
          };
        case 'card.transaction':
          return { type, customerId, tx: body.tx as CardTx };
        case 'deposit.credited':
          return { type, customerId, amount: String(body.amount), currency: String(body.currency) };
        case 'card.status':
          return { type, customerId, status: body.status as CardStatus };
        default:
          return { type: 'unknown', raw: body };
      }
    } catch {
      return { type: 'unknown', raw: rawBody };
    }
  }

  // --- Mock-only controls (provider-side events, admin 3-D Secure button) ---

  approveKyc(customerId: string): void {
    this.#require(customerId).kyc = 'approved';
  }

  rejectKyc(customerId: string, reason: string): void {
    const c = this.#require(customerId);
    c.kyc = 'rejected';
    c.kycReason = reason;
  }

  creditDeposit(customerId: string, amount: number): void {
    this.#require(customerId).balance += amount;
  }

  addTransaction(
    customerId: string,
    input: {
      merchant: string;
      amount: number;
      category?: string;
      country?: string;
      cashback?: number;
    },
  ): CardTx {
    const c = this.#require(customerId);
    const tx: CardTx = {
      id: `tx_${randomUUID()}`,
      merchant: input.merchant,
      category: input.category,
      country: input.country,
      amount: money(input.amount),
      currency: c.currency,
      status: 'settled',
      cashback: input.cashback !== undefined ? money(input.cashback) : undefined,
      at: new Date(this.#now()).toISOString(),
    };
    c.transactions.push(tx);
    c.balance = Math.max(0, c.balance - input.amount);
    if (c.card) c.card.dailyUsage += input.amount;
    return tx;
  }

  initiate3ds(
    customerId: string,
    input: { merchant: string; amount: number; currency?: string },
  ): ThreeDsRequest {
    const c = this.#require(customerId);
    const req: ThreeDsRequest = {
      transactionId: `3ds_${randomUUID()}`,
      merchant: input.merchant,
      amount: money(input.amount),
      currency: input.currency ?? c.currency,
      cardLast4: c.card?.last4,
      // Expires 5 minutes after creation, minus a 15-second buffer (docs/architecture.md section 19).
      expiresAt: new Date(this.#now() + FIVE_MIN - 15_000).toISOString(),
    };
    c.pending3ds.push(req);
    return req;
  }

  createWithdrawal(
    customerId: string,
    input: { amount: number; token: string; toAddress: string },
  ): PendingWithdrawal {
    const c = this.#require(customerId);
    const w: MockWithdrawal = {
      id: `wd_${randomUUID()}`,
      destinationAddress: input.toAddress,
      amount: money(input.amount),
      validAfter: new Date(this.#now() + 3000).toISOString(), // 3-second protective delay
      status: 'sending',
      createdAt: this.#now(),
    };
    c.withdrawals.push(w);
    c.balance = Math.max(0, c.balance - input.amount);
    const { createdAt: _createdAt, ...pending } = w;
    return pending;
  }
}
