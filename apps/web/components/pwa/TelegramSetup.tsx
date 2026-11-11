'use client';

import { useEffect } from 'react';
import { telegramWebApp } from '@/lib/telegram';

/**
 * Initialises the Telegram Mini App when the page runs inside Telegram: marks the document (so the
 * install banner hides and the nav gets home-indicator clearance), expands to full height, and tints
 * Telegram's own chrome to match. No-op in a normal browser / PWA. Renders nothing.
 */
export function TelegramSetup() {
  useEffect(() => {
    const apply = (): boolean => {
      const tg = telegramWebApp();
      if (!tg) return false;
      document.documentElement.classList.add('tg');
      try {
        tg.ready?.();
        tg.expand?.();
        tg.setHeaderColor?.('#16171B');
        tg.setBackgroundColor?.('#05081f');
      } catch {
        /* older clients may not support every method */
      }
      return true;
    };
    if (apply()) return;
    // The SDK may inject a moment after hydration; retry briefly.
    let tries = 0;
    const id = setInterval(() => {
      if (apply() || ++tries > 20) clearInterval(id);
    }, 100);
    return () => clearInterval(id);
  }, []);
  return null;
}
