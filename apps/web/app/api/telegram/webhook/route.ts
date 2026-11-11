import { NextResponse } from 'next/server';
import { getConfig } from '@pastra/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const GREETING = [
  'Welcome to HEXTRA ⬡',
  '',
  'Your pass is six sides of your life in one hexagon — gaming, crypto, music, social, sports, lifestyle. Connect what you already use, level up every week, and unlock a crypto Visa card with cashback.',
  '',
  'Tap below to build yours 👇',
].join('\n');

const HELP = [
  'HEXTRA turns your digital life into one weekly pass.',
  '',
  '• Connect services (Steam, wallets, Spotify, fitness…) — each adds to one of six axes.',
  '• Every week you get a level, a title and stamps.',
  '• Share your pass and unlock a crypto Visa card with cashback.',
  '',
  'Open the app to get started.',
].join('\n');

interface TgUpdate {
  message?: { chat?: { id?: number }; text?: string };
}

async function callTelegram(token: string, method: string, body: unknown): Promise<void> {
  await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

/**
 * POST /api/telegram/webhook — the bot's update handler. Telegram posts each update here (set once
 * with setWebhook, carrying a secret_token that it echoes back in a header we verify). Replies to
 * the common commands with a greeting and an "Open HEXTRA" Mini App button. Never logs message text.
 */
export async function POST(request: Request) {
  const config = getConfig();
  const token = config.TELEGRAM_BOT_TOKEN;
  if (!token) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });

  // Telegram echoes the secret set on setWebhook; reject anything else.
  const secret = config.TELEGRAM_WEBHOOK_SECRET;
  if (secret && request.headers.get('x-telegram-bot-api-secret-token') !== secret) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  let update: TgUpdate;
  try {
    update = (await request.json()) as TgUpdate;
  } catch {
    return NextResponse.json({ ok: true });
  }

  const chatId = update.message?.chat?.id;
  const text = (update.message?.text ?? '').trim();
  if (!chatId || !text) return NextResponse.json({ ok: true });

  const command = text.split(/\s+/)[0]!.toLowerCase().replace(/@.*$/, '');
  const openButton = {
    inline_keyboard: [[{ text: '⬡ Open HEXTRA', web_app: { url: config.APP_URL } }]],
  };

  if (command === '/start') {
    await callTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: GREETING,
      reply_markup: openButton,
    });
  } else if (command === '/help') {
    await callTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: HELP,
      reply_markup: openButton,
    });
  } else {
    await callTelegram(token, 'sendMessage', {
      chat_id: chatId,
      text: 'Open HEXTRA to build your pass 👇',
      reply_markup: openButton,
    });
  }

  return NextResponse.json({ ok: true });
}
