'use client';

import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/ui/Button';

type Platform = 'ios' | 'android' | 'desktop';

const DISMISS_KEY = 'hextra:install-dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  const iOS =
    /iphone|ipad|ipod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (iOS) return 'ios';
  if (/android/i.test(ua)) return 'android';
  return 'desktop';
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

/**
 * Top-of-app "Save for Fast Access" banner. Shown only on a mobile device (iOS/Android), only when
 * the app is not already installed, and only until the user dismisses it (remembered per device).
 * The Save action opens a modal with platform-specific install instructions; on Android the modal can
 * trigger the native install prompt directly. Never shown on desktop.
 */
export function InstallBanner() {
  const [ready, setReady] = useState(false);
  const [platform, setPlatform] = useState<Platform>('desktop');
  const [standalone, setStandalone] = useState(false);
  const [dismissed, setDismissed] = useState(true);
  const [open, setOpen] = useState(false);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    setPlatform(detectPlatform());
    setStandalone(isStandalone());
    try {
      setDismissed(localStorage.getItem(DISMISS_KEY) === '1');
    } catch {
      setDismissed(false);
    }
    setReady(true);

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setStandalone(true);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    setDismissed(true);
    setOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const install = async () => {
    if (!deferred) return;
    await deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice.outcome === 'accepted') dismiss();
  };

  if (!ready || standalone || dismissed || platform === 'desktop') return null;

  return (
    <>
      <div className="flex shrink-0 items-center gap-3 border-b border-divider bg-panel px-4 py-2.5">
        <img src="/brand/pastra-logo.svg" alt="" width={34} height={34} className="rounded-[9px]" />
        <div className="min-w-0 flex-1">
          <p className="font-head text-[13px] font-bold leading-tight text-ink">
            Save for Fast Access
          </p>
          <p className="truncate text-[11px] text-ink-3">Add HEXTRA to your home screen</p>
        </div>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-head rounded-[9px] bg-orange px-3.5 py-1.5 text-[12px] font-bold uppercase tracking-wide text-on-orange"
        >
          Save
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-ink-3 hover:text-ink"
        >
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>

      {open && (
        <InstallModal
          platform={platform}
          canPrompt={!!deferred}
          onInstall={install}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

function InstallModal({
  platform,
  canPrompt,
  onInstall,
  onClose,
}: {
  platform: Platform;
  canPrompt: boolean;
  onInstall: () => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Install HEXTRA"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[430px] rounded-t-3xl border border-divider bg-panel p-5 pb-7 sm:rounded-3xl"
      >
        <div className="mb-4 flex items-center gap-3">
          <img src="/brand/pastra-logo.svg" alt="" width={40} height={40} className="rounded-xl" />
          <div className="flex-1">
            <p className="font-head text-base font-extrabold text-ink">Install HEXTRA</p>
            <p className="text-[12px] text-ink-3">One tap to your home screen</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-3 hover:text-ink"
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
              <path
                d="M6 6l12 12M18 6L6 18"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {platform === 'ios' && <IosSteps />}
        {platform === 'android' && canPrompt && (
          <div className="space-y-3">
            <p className="text-[13px] text-ink-2">Install HEXTRA as an app on your phone.</p>
            <PrimaryButton onClick={onInstall}>Install app</PrimaryButton>
          </div>
        )}
        {platform === 'android' && !canPrompt && <AndroidSteps />}
      </div>
    </div>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="font-head mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-orange text-[12px] font-bold text-on-orange">
        {n}
      </span>
      <span className="text-[13px] leading-snug text-ink-2">{children}</span>
    </li>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="16"
      height="16"
      fill="none"
      className="mx-0.5 inline-block align-text-bottom text-blue"
      aria-hidden
    >
      <path
        d="M12 3v11M8.5 6.5 12 3l3.5 3.5"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M7 11H5.5A1.5 1.5 0 0 0 4 12.5V19a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-6.5A1.5 1.5 0 0 0 18.5 11H17"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IosSteps() {
  return (
    <ol className="space-y-3">
      <Step n={1}>
        Tap the <strong className="text-ink">Share</strong> button
        <ShareIcon />
        in the Safari toolbar.
      </Step>
      <Step n={2}>
        Scroll down and tap <strong className="text-ink">Add to Home Screen</strong>.
      </Step>
      <Step n={3}>
        Tap <strong className="text-ink">Add</strong> — HEXTRA appears on your home screen.
      </Step>
    </ol>
  );
}

function AndroidSteps() {
  return (
    <ol className="space-y-3">
      <Step n={1}>
        Open the browser menu <strong className="text-ink">⋮</strong> (top-right).
      </Step>
      <Step n={2}>
        Tap <strong className="text-ink">Add to Home screen</strong> (or{' '}
        <strong className="text-ink">Install app</strong>).
      </Step>
      <Step n={3}>
        Confirm <strong className="text-ink">Install</strong>.
      </Step>
    </ol>
  );
}
