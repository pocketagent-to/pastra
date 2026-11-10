/** Card and KYC statuses (docs/architecture.md section 11, verified against Wirex 10 Nov). */
export type CardStatus = 'requested' | 'active' | 'blocked' | 'closed';
export type KycStatus = 'none' | 'applied' | 'in_review' | 'approved' | 'rejected' | 'canceled';

export interface CardTx {
  id: string;
  merchant: string;
  category?: string;
  country?: string;
  /** Money as a decimal string, never a float (docs/architecture.md section 12). */
  amount: string;
  currency: string;
  status: 'authorized' | 'settled' | 'failed';
  cashback?: string;
  at: string; // ISO timestamp
}

export interface CardDetails {
  cardId: string;
  status: CardStatus;
  last4?: string;
  expiry?: string;
  dailyLimit: number | null;
  dailyUsage: number;
  currency: string;
}

export interface Balance {
  available: string;
  currency: 'USD' | 'EUR';
}

export interface DepositAddresses {
  /** One address for all EVM networks. */
  evm: string;
  solana?: string;
  tron?: string;
}

export interface PendingWithdrawal {
  id: string;
  destinationAddress: string;
  amount: string;
  validAfter: string; // ISO
  hash?: string;
  callData?: string;
  status: 'sending' | 'sent' | 'unfinished';
}

export interface ThreeDsRequest {
  transactionId: string;
  merchant: string;
  amount: string;
  currency: string;
  cardLast4?: string;
  expiresAt: string; // ISO
}

/** Parsed webhook events. Webhooks are only a signal: always re-read state from the API. */
export type CardWebhookEvent =
  | { type: 'kyc.updated'; customerId: string; status: KycStatus; reason?: string }
  | { type: 'card.transaction'; customerId: string; tx: CardTx }
  | { type: 'deposit.credited'; customerId: string; amount: string; currency: string }
  | { type: 'card.status'; customerId: string; status: CardStatus }
  | { type: 'three_ds'; customerId: string; request: ThreeDsRequest }
  | {
      type: 'withdrawal';
      customerId: string;
      withdrawalId: string;
      status: PendingWithdrawal['status'];
    }
  | {
      type: 'cashback.credited';
      customerId: string;
      amount: string;
      currency: string;
      reference?: string;
    }
  | { type: 'unknown'; raw: unknown };

export type Clock = () => number;
