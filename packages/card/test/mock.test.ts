import { describe, expect, it } from 'vitest';
import { MockCardProvider, MockWalletProvider, createCardProvider } from '@pastra/card';

async function enrol(now: () => number) {
  const card = new MockCardProvider({ now });
  const wallet = new MockWalletProvider();
  const { address } = await wallet.getOrCreateWallet('user-1');
  const { customerId } = await card.createUser({
    userAddress: address,
    email: 'a@b.co',
    country: 'PL',
  });
  return { card, customerId };
}

describe('MockCardProvider (docs/architecture.md section 11, scenarios 9-10, 14-19)', () => {
  it('rejects an unsupported country', async () => {
    const card = new MockCardProvider();
    await expect(
      card.createUser({ userAddress: '0xabc', email: 'a@b.co', country: 'US' }),
    ).rejects.toThrow(/country_not_supported/);
  });

  it('runs the KYC -> issue -> active-card path', async () => {
    const { card, customerId } = await enrol(() => 1000);
    expect((await card.getKycStatus(customerId)).status).toBe('none');
    await card.startKyc(customerId);
    expect((await card.getKycStatus(customerId)).status).toBe('applied');

    await expect(card.issueVirtualCard(customerId)).rejects.toThrow('kyc_not_approved');
    card.approveKyc(customerId);
    expect((await card.getKycStatus(customerId)).canIssueVirtualCard).toBe(true);

    const issued = await card.issueVirtualCard(customerId);
    expect(issued.status).toBe('active');
    const details = await card.getCard(customerId);
    expect(details.last4).toHaveLength(4);
    expect(details.dailyLimit).toBeNull(); // new cards have no limit
  });

  it('freezes, unfreezes and sets a daily limit', async () => {
    const { card, customerId } = await enrol(() => 1000);
    card.approveKyc(customerId);
    await card.issueVirtualCard(customerId);
    await card.setFrozen(customerId, true);
    expect((await card.getCard(customerId)).status).toBe('blocked');
    await expect(card.setDailyLimit(customerId, 100)).rejects.toThrow('card_not_active');
    await card.setFrozen(customerId, false);
    await card.setDailyLimit(customerId, 250);
    expect((await card.getCard(customerId)).dailyLimit).toBe(250);
  });

  it('records a transaction with cashback and lists Recent', async () => {
    const { card, customerId } = await enrol(() => 1000);
    card.approveKyc(customerId);
    await card.issueVirtualCard(customerId);
    card.creditDeposit(customerId, 100);
    card.addTransaction(customerId, {
      merchant: 'Acme',
      amount: 24,
      category: 'Gaming',
      cashback: 1.92,
    });
    const { items } = await card.listTransactions(customerId);
    expect(items[0]?.merchant).toBe('Acme');
    expect(items[0]?.cashback).toBe('1.92');
    expect((await card.getBalance(customerId)).available).toBe('76.00');
  });

  it('creates and resolves a 3-D Secure request; a stale one expires', async () => {
    let now = 1000;
    const { card, customerId } = await enrol(() => now);
    card.approveKyc(customerId);
    await card.issueVirtualCard(customerId);
    const req = card.initiate3ds(customerId, { merchant: 'Shop', amount: 40 });
    expect(await card.listPending3ds(customerId)).toHaveLength(1);
    await card.resolve3ds(customerId, req.transactionId, 'approve');
    expect(await card.listPending3ds(customerId)).toHaveLength(0);
    await expect(card.resolve3ds(customerId, req.transactionId, 'approve')).rejects.toThrow(
      'no_active_request',
    );

    card.initiate3ds(customerId, { merchant: 'Shop2', amount: 10 });
    now += 6 * 60 * 1000; // past the 5-minute window
    expect(await card.listPending3ds(customerId)).toHaveLength(0);
  });

  it('settles a mock withdrawal after 5 seconds', async () => {
    let now = 1000;
    const { card, customerId } = await enrol(() => now);
    card.approveKyc(customerId);
    await card.issueVirtualCard(customerId);
    card.creditDeposit(customerId, 50);
    card.createWithdrawal(customerId, { amount: 20, token: 'USDC', toAddress: '0xdead' });
    expect(await card.listPendingWithdrawals(customerId)).toHaveLength(1);
    now += 5000;
    expect(await card.listPendingWithdrawals(customerId)).toHaveLength(0); // now sent
  });

  it('refuses to close a card with a non-zero balance (scenario 19)', async () => {
    const { card, customerId } = await enrol(() => 1000);
    card.approveKyc(customerId);
    await card.issueVirtualCard(customerId);
    card.creditDeposit(customerId, 5);
    await expect(card.closeCard(customerId)).rejects.toThrow('non_zero_balance');
  });

  it('parses a kyc.updated webhook', async () => {
    const card = new MockCardProvider();
    const event = card.parseWebhook(
      '/webhooks/card',
      JSON.stringify({ type: 'kyc.updated', customerId: 'c1', status: 'approved' }),
      '1.2.3.4',
    );
    expect(event).toEqual({
      type: 'kyc.updated',
      customerId: 'c1',
      status: 'approved',
      reason: undefined,
    });
  });

  it('the factory builds the mock and defers wirex', () => {
    expect(createCardProvider({ provider: 'mock' })).toBeInstanceOf(MockCardProvider);
    expect(() => createCardProvider({ provider: 'wirex' })).toThrow(/stage 8/);
  });
});
