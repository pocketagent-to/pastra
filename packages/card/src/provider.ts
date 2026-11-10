import type {
  Balance,
  CardDetails,
  CardStatus,
  CardTx,
  CardWebhookEvent,
  DepositAddresses,
  KycStatus,
  PendingWithdrawal,
  ThreeDsRequest,
} from './types';

/**
 * The single contract for all card operations (docs/architecture.md section 11). Two
 * implementations: `mock` (a full in-memory simulation for development and tests) and `wirex`
 * (built against the Wirex BaaS sandbox in the card stage). Card details (number/expiry/CVV) are
 * never returned here — they are shown only through Wirex's PCI iframe via an action token.
 */
export interface CardProvider {
  supportedCountries(): Promise<string[]>;

  /** Register the user with the provider by their wallet address (EOA). */
  createUser(input: {
    userAddress: string;
    email: string;
    country: string;
  }): Promise<{ customerId: string }>;

  /** Start identity verification (SumSub) on the provider's side. */
  startKyc(customerId: string): Promise<{ url: string }>;
  getKycStatus(
    customerId: string,
  ): Promise<{ status: KycStatus; reason?: string; canIssueVirtualCard: boolean }>;

  issueVirtualCard(customerId: string): Promise<{ cardId: string; status: CardStatus }>;
  getCard(customerId: string): Promise<CardDetails>;
  getBalance(customerId: string): Promise<Balance>;
  listTransactions(
    customerId: string,
    cursor?: string,
  ): Promise<{ items: CardTx[]; next?: string }>;

  setFrozen(customerId: string, frozen: boolean): Promise<void>;
  setDailyLimit(customerId: string, amount: number | null): Promise<void>;
  closeCard(customerId: string): Promise<void>;

  /** A 5-minute action token to show card details through the provider's component. */
  requestActionToken(
    customerId: string,
    method: 'sms' | 'signature',
    proof?: string,
  ): Promise<{ token: string; expiresAt: Date }>;

  getDepositAddresses(customerId: string): Promise<DepositAddresses>;

  listPendingWithdrawals(customerId: string): Promise<PendingWithdrawal[]>;

  listPending3ds(customerId: string): Promise<ThreeDsRequest[]>;
  resolve3ds(
    customerId: string,
    transactionId: string,
    decision: 'approve' | 'decline',
  ): Promise<void>;

  /** Webhooks carry no signature: verify the source IP and dedupe; this only parses the body. */
  parseWebhook(path: string, rawBody: string, sourceIp: string): CardWebhookEvent;
}
