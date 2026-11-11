'use client';

import { useRouter } from 'next/navigation';
import { getAccessToken, useLogin } from '@privy-io/react-auth';

/**
 * Google + email sign-in block for A11 (design/Login.html). Real Google/email login needs owner
 * keys, so there is no dedicated backend: the working path is Privy (email + Google in one modal),
 * reused from the sign-up flow. When Privy is not configured the same buttons fall back to the
 * sign-up entry point so they are never dead links — no fake backend is invented (CLAUDE.md §18).
 */

/** The exact mockup markup; only the click/submit targets change between modes. */
function MethodsMarkup({
  onGoogle,
  onEmail,
}: {
  onGoogle: () => void;
  onEmail: (event: React.FormEvent) => void;
}) {
  return (
    <>
      <div className="flex flex-col gap-2.5">
        <button
          type="button"
          onClick={onGoogle}
          className="flex h-[54px] items-center justify-center rounded-button bg-white text-[15px] font-semibold text-on-orange"
        >
          Continue with Google
        </button>
      </div>

      <div className="flex items-center gap-3 text-[13px] text-ink-3">
        <div className="h-px flex-1 bg-divider" />
        or
        <div className="h-px flex-1 bg-divider" />
      </div>

      <form onSubmit={onEmail} className="flex flex-col gap-2.5">
        <label htmlFor="login-email" className="text-[13px] font-semibold text-ink-2">
          Email
        </label>
        <input
          id="login-email"
          name="email"
          type="email"
          placeholder="you@example.com"
          className="h-[54px] rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 text-[15px] text-ink placeholder:text-ink-3 outline-none"
        />
        <button
          type="submit"
          className="flex h-14 items-center justify-center rounded-button bg-orange font-head text-[13px] font-bold uppercase tracking-[0.03em] text-on-orange"
        >
          Send me a login link
        </button>
      </form>
    </>
  );
}

/** Privy-backed sign-in (email + Google), exchanging the Privy token for a Pastra session. */
function PrivyMethods() {
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
  const open = () => login();
  return (
    <MethodsMarkup
      onGoogle={open}
      onEmail={(event) => {
        event.preventDefault();
        open();
      }}
    />
  );
}

/** Fallback when Privy is not configured: route to the sign-up entry rather than a dead link. */
function FallbackMethods() {
  const router = useRouter();
  const go = () => router.push('/signup');
  return (
    <MethodsMarkup
      onGoogle={go}
      onEmail={(event) => {
        event.preventDefault();
        go();
      }}
    />
  );
}

export function LoginMethods({ privyConfigured }: { privyConfigured: boolean }) {
  return privyConfigured ? <PrivyMethods /> : <FallbackMethods />;
}
