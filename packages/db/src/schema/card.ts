import { boolean, jsonb, pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, pk, ref } from './ids';

/** One card account per user. No card details or documents are ever stored here. */
export const cardAccounts = pgTable('card_accounts', {
  userId: ref('user_id').primaryKey(),
  providerCustomerId: text('provider_customer_id'),
  kycStatus: text('kyc_status')
    .$type<'none' | 'applied' | 'in_review' | 'approved' | 'rejected' | 'canceled'>()
    .notNull()
    .default('none'),
  kycReason: text('kyc_reason'),
  cardStatus: text('card_status')
    .$type<'none' | 'active' | 'frozen' | 'closed'>()
    .notNull()
    .default('none'),
  last4: text('last4'),
  currency: text('currency'),
  country: text('country'),
  notifyCountry: text('notify_country'),
  depositAddressUsdc: text('deposit_address_usdc'),
  depositAddressEurc: text('deposit_address_eurc'),
  depositAddressEvm: text('deposit_address_evm'),
  depositAddressSolana: text('deposit_address_solana'),
  depositAddressTron: text('deposit_address_tron'),
  lastActivityAt: timestamp('last_activity_at', { withTimezone: true }),
  countInPass: boolean('count_in_pass').notNull().default(true),
  createdAt: createdAt(),
});

/** Incoming card webhooks; the unique provider event id gives idempotency. */
export const cardEvents = pgTable(
  'card_events',
  {
    id: pk(),
    providerEventId: text('provider_event_id').notNull(),
    userId: ref('user_id'),
    type: text('type').notNull(),
    payload: jsonb('payload').$type<Record<string, unknown>>(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('card_events_provider_event_idx').on(t.providerEventId)],
);

/** On-chain withdrawals (docs/architecture.md section 19). */
export const cardWithdrawals = pgTable('card_withdrawals', {
  id: pk(),
  userId: ref('user_id').notNull(),
  amount: text('amount').notNull(),
  token: text('token').notNull(),
  toAddress: text('to_address').notNull(),
  status: text('status').$type<'sending' | 'sent' | 'unfinished'>().notNull().default('sending'),
  requestTxHash: text('request_tx_hash'),
  finalTxHash: text('final_tx_hash'),
  callData: text('call_data'),
  validAfter: timestamp('valid_after', { withTimezone: true }),
  createdAt: createdAt(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

/** 3-D Secure requests (docs/architecture.md section 19). */
export const card3dsRequests = pgTable('card_3ds_requests', {
  id: pk(),
  userId: ref('user_id').notNull(),
  merchant: text('merchant'),
  amount: text('amount'),
  currency: text('currency'),
  status: text('status')
    .$type<'pending' | 'approved' | 'declined' | 'expired'>()
    .notNull()
    .default('pending'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  wirexOperationId: text('wirex_operation_id'),
  createdAt: createdAt(),
});

/** Cashback ledger; payout is hidden behind CASHBACK_PAYOUT_ENABLED (docs/architecture.md §11). */
export const cashbackLedger = pgTable(
  'cashback_ledger',
  {
    id: pk(),
    userId: ref('user_id').notNull(),
    userOfferId: ref('user_offer_id'),
    amount: text('amount').notNull(),
    currency: text('currency').notNull(),
    status: text('status').$type<'pending' | 'paid' | 'failed'>().notNull().default('pending'),
    eventKey: text('event_key').notNull(),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex('cashback_ledger_event_idx').on(t.eventKey)],
);
