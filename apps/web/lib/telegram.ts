interface TgWebApp {
  platform?: string;
  initData?: string;
  ready?: () => void;
  expand?: () => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
}

function rawWebApp(): TgWebApp | undefined {
  if (typeof window === 'undefined') return undefined;
  return (window as unknown as { Telegram?: { WebApp?: TgWebApp } }).Telegram?.WebApp;
}

/**
 * True only when actually running inside the Telegram Mini App. The SDK, loaded in a normal browser,
 * still creates a WebApp object but with platform 'unknown' — so we key off a real platform, not the
 * object's mere existence.
 */
export function isTelegram(): boolean {
  const tg = rawWebApp();
  return !!tg && !!tg.platform && tg.platform !== 'unknown';
}

/** The Telegram WebApp instance when inside Telegram, else undefined. */
export function telegramWebApp(): TgWebApp | undefined {
  return isTelegram() ? rawWebApp() : undefined;
}
