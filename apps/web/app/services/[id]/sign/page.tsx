'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useWallets } from '@privy-io/react-auth';
import { BackHeader } from '@/components/layout/BackHeader';

/**
 * C3a · Wallet signature (design/WalletSign.html). The begin route sends wallet-signature providers
 * here with ?state=&message=; this screen asks the user's wallet to personal_sign that exact message
 * and POSTs { state, address, signature, message } to /api/connections/{provider}/verify, which runs
 * the adapter's signature check and stores the connection (docs/architecture.md section 7).
 *
 * Only `wallet_evm` can be signed from the browser today: the Privy embedded wallet is EVM-only
 * (components/auth/Providers.tsx). `wallet_solana` / `wallet_ton` render the same shell with a
 * coming-soon note instead of a button (see report openQuestions).
 *
 * Route note: the dynamic segment here is `[id]` (the repo's services segment), so the provider id
 * arrives as the `id` route param even though the begin route spells the path `/services/{provider}`.
 */

/** Privy is only wrapped around the app when its public app id is configured (layout.tsx). */
const PRIVY_ENABLED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);

type SignStatus = 'idle' | 'signing' | 'verifying' | 'error';

interface Eip1193 {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

const VERIFY_ERROR_TEXT: Record<string, string> = {
  bad_state: 'This link has expired. Start the connection again.',
  signature_mismatch: 'That signature did not match the wallet. Try again.',
  unexpected_response: 'That signature did not match the wallet. Try again.',
};

/** A wallet proof: the signing address and the signature over the challenge message. */
interface Proof {
  address: string;
  signature: string;
}

class NoWalletError extends Error {}

/** Sign the message with an injected EIP-1193 wallet (window.ethereum). */
async function signWithInjected(message: string): Promise<Proof> {
  const injected = (globalThis as { ethereum?: Eip1193 }).ethereum;
  if (!injected) throw new NoWalletError('No wallet available');
  const accounts = (await injected.request({ method: 'eth_requestAccounts' })) as string[];
  const address = accounts?.[0];
  if (!address) throw new NoWalletError('No wallet account');
  const signature = (await injected.request({
    method: 'personal_sign',
    params: [message, address],
  })) as string;
  return { address, signature };
}

/** Map a signing failure to a short, non-sensitive message (never logs the address or signature). */
function signErrorText(error: unknown): string {
  if (error instanceof NoWalletError) {
    return 'No wallet found. Open this page in your wallet browser to continue.';
  }
  if ((error as { code?: number })?.code === 4001) return 'Signature request was rejected.';
  return 'Could not sign the message. Try again.';
}

interface ActionProps {
  provider: string;
  state: string;
  message: string;
}

/** POST the proof to verify and follow the returned redirect; set status/error on failure. */
async function submitProof(
  props: ActionProps,
  proof: Proof,
  router: ReturnType<typeof useRouter>,
  setStatus: (s: SignStatus) => void,
  setError: (e: string | null) => void,
): Promise<void> {
  setStatus('verifying');
  const res = await fetch(`/api/connections/${props.provider}/verify`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      state: props.state,
      address: proof.address,
      signature: proof.signature,
      message: props.message,
    }),
  });
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean;
    redirect?: string;
    error?: { code?: string };
  };
  if (res.ok && data.redirect) {
    router.push(data.redirect);
    router.refresh();
    return;
  }
  setStatus('error');
  setError(VERIFY_ERROR_TEXT[data.error?.code ?? ''] ?? 'Could not verify your wallet. Try again.');
}

/** The primary action when the Privy embedded wallet is available (falls back to injected). */
function PrivyWalletButton(props: ActionProps) {
  const { wallets } = useWallets();
  const router = useRouter();
  const [status, setStatus] = useState<SignStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  async function sign() {
    setError(null);
    setStatus('signing');
    try {
      const wallet = wallets.find((w) => w.walletClientType === 'privy') ?? wallets[0];
      let proof: Proof;
      if (wallet) {
        const eip1193 = (await wallet.getEthereumProvider()) as Eip1193;
        const signature = (await eip1193.request({
          method: 'personal_sign',
          params: [props.message, wallet.address],
        })) as string;
        proof = { address: wallet.address, signature };
      } else {
        proof = await signWithInjected(props.message);
      }
      await submitProof(props, proof, router, setStatus, setError);
    } catch (e) {
      setStatus('error');
      setError(signErrorText(e));
    }
  }

  return <SignFooter onSign={sign} status={status} error={error} />;
}

/** The primary action when Privy is not configured: use the browser's injected wallet only. */
function InjectedWalletButton(props: ActionProps) {
  const router = useRouter();
  const [status, setStatus] = useState<SignStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  async function sign() {
    setError(null);
    setStatus('signing');
    try {
      const proof = await signWithInjected(props.message);
      await submitProof(props, proof, router, setStatus, setError);
    } catch (e) {
      setStatus('error');
      setError(signErrorText(e));
    }
  }

  return <SignFooter onSign={sign} status={status} error={error} />;
}

/** The footer: the "Open my wallet" button (solid orange, design/WalletSign.html) plus Cancel. */
function SignFooter({
  onSign,
  status,
  error,
}: {
  onSign: () => void;
  status: SignStatus;
  error: string | null;
}) {
  const busy = status === 'signing' || status === 'verifying';
  const label =
    status === 'signing'
      ? 'Check your wallet…'
      : status === 'verifying'
        ? 'Verifying…'
        : 'Open my wallet';
  return (
    <div className="mt-auto flex flex-col gap-2.5">
      {error && <p className="text-[13px] font-semibold text-[#FF8A7A]">{error}</p>}
      <button
        type="button"
        onClick={onSign}
        disabled={busy}
        className="flex h-14 items-center justify-center rounded-button bg-orange font-head text-[14px] font-bold uppercase tracking-[0.03em] text-on-orange disabled:opacity-60"
      >
        {label}
      </button>
      <Link
        href="/services"
        className="flex min-h-11 items-center justify-center text-[14px] text-ink-2"
      >
        Cancel
      </Link>
    </div>
  );
}

/** Coming-soon footer for non-EVM wallets (Solana / TON) — a message in place of a broken button. */
function ComingSoonFooter() {
  return (
    <div className="mt-auto flex flex-col gap-2.5">
      <div className="rounded-tile border border-divider bg-panel px-4 py-3.5 text-[13px] leading-[1.5] text-ink-2">
        Signing in with this wallet is coming soon. For now, connect an EVM wallet to grow your
        Crypto side.
      </div>
      <Link
        href="/services"
        className="flex min-h-11 items-center justify-center text-[14px] text-ink-2"
      >
        Cancel
      </Link>
    </div>
  );
}

const CheckIcon = () => (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    aria-hidden="true"
    fill="none"
    stroke="#4ADE80"
    strokeWidth="2.4"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="shrink-0"
  >
    <path d="M4 10l4 4 8-9" />
  </svg>
);

const CrossIcon = () => (
  <svg
    viewBox="0 0 20 20"
    width="20"
    height="20"
    aria-hidden="true"
    fill="none"
    stroke="#FF8A7A"
    strokeWidth="2.4"
    strokeLinecap="round"
    className="shrink-0"
  >
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

/** The wallet-signature screen; reads state/message from the query and the provider from the route. */
function SignScreen() {
  const params = useParams<{ id: string }>();
  const search = useSearchParams();
  const provider = typeof params.id === 'string' ? params.id : '';
  const state = search.get('state') ?? '';
  const message = search.get('message') ?? '';
  const isEvm = provider === 'wallet_evm';
  const canSign = isEvm && Boolean(state) && Boolean(message);

  return (
    <div className="flex min-h-dvh flex-col">
      <BackHeader title="Connect wallet" back="/services" />
      <main className="app-shell flex flex-1 flex-col gap-5 px-5 pb-6 pt-6">
        <div className="flex flex-col gap-2.5">
          <h1 className="font-head text-2xl font-extrabold uppercase leading-[1.2]">
            Prove this wallet is yours
          </h1>
          <p className="text-[15px] leading-[1.5] text-ink-2">
            Your wallet will ask you to sign a short message. It&apos;s free and it is not a
            transaction.
          </p>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="font-head text-[13px] font-bold tracking-[0.05em]">
            THE MESSAGE YOU&apos;LL SIGN
          </div>
          <div className="whitespace-pre-wrap break-words rounded-tile border border-divider bg-panel p-4 font-mono text-[13px] leading-[1.55] text-ink-2">
            {message ||
              'Hextra asks you to confirm you own this wallet. This request will not start a transaction or cost any fees.'}
          </div>
        </div>

        <div className="flex flex-col rounded-panel bg-panel px-4 py-1">
          <div className="flex min-h-[50px] items-center gap-3 text-[14px]">
            <CheckIcon />
            We read public history: wallet age, activity, NFT count
          </div>
          <div className="flex min-h-[50px] items-center gap-3 border-t border-divider text-[14px]">
            <CrossIcon />
            This signature can&apos;t move your funds
          </div>
          <div className="flex min-h-[50px] items-center gap-3 border-t border-divider text-[14px]">
            <CrossIcon />
            We never read or show your balances
          </div>
          <div className="flex min-h-[50px] items-center gap-3 border-t border-divider text-[14px]">
            <CrossIcon />
            Your address is never shown on your pass
          </div>
        </div>

        <div className="rounded-tile border-[1.5px] border-dashed border-orange px-4 py-3.5 text-[13px] leading-[1.5] text-ink-2">
          If your wallet shows a transaction, a token approval or a fee, reject it. Hextra never
          asks for those.
        </div>

        {canSign ? (
          PRIVY_ENABLED ? (
            <PrivyWalletButton provider={provider} state={state} message={message} />
          ) : (
            <InjectedWalletButton provider={provider} state={state} message={message} />
          )
        ) : (
          <ComingSoonFooter />
        )}
      </main>
    </div>
  );
}

export default function WalletSignPage() {
  return (
    <Suspense fallback={<div className="app-shell min-h-dvh" />}>
      <SignScreen />
    </Suspense>
  );
}
