import type { EmailMessage, Mailer, TelegramClient } from './types';

/** An in-memory mailer that records what would be sent (development and tests). */
export class MockMailer implements Mailer {
  readonly sent: EmailMessage[] = [];
  async send(message: EmailMessage): Promise<void> {
    this.sent.push(message);
  }
}

/** An in-memory Telegram client that records messages per chat. */
export class MockTelegram implements TelegramClient {
  readonly sent: Array<{ chatId: string; text: string }> = [];
  async send(chatId: string, text: string): Promise<void> {
    this.sent.push({ chatId, text });
  }
}
