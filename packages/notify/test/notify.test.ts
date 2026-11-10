import { describe, expect, it } from 'vitest';
import { MockMailer, MockTelegram, templates } from '@pastra/notify';

describe('notification templates (docs/product-spec.md section 13)', () => {
  it('formats the drop message', () => {
    expect(templates.drop(26, 27, 3)).toBe('Your week is in. LVL 26 → 27, 3 new offers.');
  });

  it('shows the transaction amount and cashback, never a balance', () => {
    expect(templates.cardPayment('Acme', '24.00', '1.92')).toBe('−24.00 at Acme. Cashback +1.92.');
    expect(templates.cardPayment('Acme', '24.00')).toBe('−24.00 at Acme.');
  });

  it('formats KYC and country messages', () => {
    expect(templates.kycApproved()).toBe('Your card is active.');
    expect(templates.countryOpen('Georgia')).toBe('Cards are now open in Georgia.');
  });
});

describe('mock transports', () => {
  it('records mail and telegram sends', async () => {
    const mail = new MockMailer();
    const tg = new MockTelegram();
    await mail.send({ to: 'a@b.co', subject: 'Hi', text: 'Body' });
    await tg.send('chat-1', 'Hello');
    expect(mail.sent).toHaveLength(1);
    expect(tg.sent[0]).toEqual({ chatId: 'chat-1', text: 'Hello' });
  });
});
