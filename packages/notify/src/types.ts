export type Channel = 'telegram' | 'email';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
}

export interface Mailer {
  send(message: EmailMessage): Promise<void>;
}

export interface TelegramClient {
  send(chatId: string, text: string): Promise<void>;
}
