'use client';

import { useEffect } from 'react';

/** Registers the service worker once on the client (installability + web push). Renders nothing. */
export function PwaSetup() {
  useEffect(() => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/sw.js').catch(() => {
      /* registration is best-effort; the app works without it */
    });
  }, []);
  return null;
}
