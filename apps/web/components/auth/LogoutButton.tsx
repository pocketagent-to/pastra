'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { usePrivy } from '@privy-io/react-auth';

const CLASS =
  'flex h-[52px] w-full items-center justify-center rounded-button border-[1.5px] border-ink text-[15px] font-semibold disabled:opacity-60';

function useLogout() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const run = async (privyLogout?: () => Promise<void>) => {
    if (busy) return;
    setBusy(true);
    // Clear our session first, then the Privy session so re-login is not instant.
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // ignore; we still clear Privy and navigate below
    }
    try {
      if (privyLogout) await privyLogout();
    } catch {
      // ignore
    }
    router.replace('/signup');
    router.refresh();
  };
  return [busy, run] as const;
}

function PrivyLogout() {
  const { logout } = usePrivy();
  const [busy, run] = useLogout();
  return (
    <button type="button" className={CLASS} disabled={busy} onClick={() => run(logout)}>
      {busy ? 'Logging out…' : 'Log out'}
    </button>
  );
}

function PlainLogout() {
  const [busy, run] = useLogout();
  return (
    <button type="button" className={CLASS} disabled={busy} onClick={() => run()}>
      {busy ? 'Logging out…' : 'Log out'}
    </button>
  );
}

/** Logs out of both the Hextra session and Privy, then returns to the sign-in screen. */
export function LogoutButton({ privyConfigured }: { privyConfigured: boolean }) {
  return privyConfigured ? <PrivyLogout /> : <PlainLogout />;
}
