'use client';

import { useRouter } from 'next/navigation';
import { getAccessToken, useLogin } from '@privy-io/react-auth';

/**
 * Recover-access methods for A12 (design/Recover.html). Recovery really means "sign in with another
 * linked method", which needs owner keys, so there is no dedicated backend: the working path is
 * Privy (email + Google), reused from sign-up. When Privy is not configured the tiles fall back to
 * the sign-up entry so they are never dead links — no fake backend is invented (CLAUDE.md §18).
 */

const CHEVRON = (
  <svg
    viewBox="0 0 24 24"
    width="20"
    height="20"
    aria-hidden="true"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0 text-orange"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function Tile({
  title,
  subtitle,
  onClick,
}: {
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[60px] items-center justify-between rounded-tile bg-panel px-4 py-3 text-left"
    >
      <span className="flex flex-col gap-0.5">
        <span className="text-[15px] font-semibold">{title}</span>
        <span className="text-[12px] text-ink-3">{subtitle}</span>
      </span>
      {CHEVRON}
    </button>
  );
}

/** Both tiles start the same sign-in flow (Privy offers email + Google in one modal). */
function Tiles({ start }: { start: () => void }) {
  return (
    <div className="flex flex-col gap-2.5">
      <Tile
        title="Email login link"
        subtitle="If you added an email to your pass"
        onClick={start}
      />
      <Tile title="Google" subtitle="If you added Google in Sign-in methods" onClick={start} />
    </div>
  );
}

/** Privy-backed recovery, exchanging the Privy token for a Hextra session. */
function PrivyRecover() {
  const router = useRouter();
  const { login } = useLogin({
    onComplete: async () => {
      const token = await getAccessToken();
      if (!token) return;
      const res = await fetch('/api/auth/privy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json().catch(() => ({}))) as { redirect?: string };
      router.push(data.redirect ?? '/pass');
    },
  });
  return <Tiles start={() => login()} />;
}

/** Fallback when Privy is not configured: route to the sign-up entry rather than a dead link. */
function FallbackRecover() {
  const router = useRouter();
  return <Tiles start={() => router.push('/signup')} />;
}

export function RecoverMethods({ privyConfigured }: { privyConfigured: boolean }) {
  return privyConfigured ? <PrivyRecover /> : <FallbackRecover />;
}
