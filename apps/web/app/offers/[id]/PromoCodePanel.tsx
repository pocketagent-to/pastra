'use client';

import { useState } from 'react';
import { PromoCode } from '@/components/ui/PromoCode';

/** The bracket placeholder getOfferView returns when no promo code is available yet. */
const PLACEHOLDER = '[PROMO-CODE]';

/**
 * D4 · Promo code box. When a code is already available (a shared code, or a pool code assigned on
 * an earlier visit) it is the plain copy-to-clipboard box. For a pool offer with nothing assigned
 * yet, the `[PROMO-CODE]` placeholder stays until the user reveals it, which POSTs to the activate
 * route to claim one personal code from the pool, then shows it in the same box.
 */
export function PromoCodePanel({ offerId, code: initial }: { offerId: string; code: string }) {
  const [code, setCode] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (code !== PLACEHOLDER) {
    return <PromoCode code={code} variant="box" />;
  }

  async function reveal() {
    if (pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(offerId)}/activate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const data = (await res.json().catch(() => ({}))) as {
        code?: string | null;
        error?: { code?: string };
      };
      if (res.ok && data.code) {
        setCode(data.code);
        return;
      }
      setError(res.ok ? 'No codes left right now.' : 'Could not reveal your code. Try again.');
    } catch {
      setError('Network error. Try again.');
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3.5 rounded-panel border-2 border-dashed border-orange p-5">
      <div className="text-[13px] text-ink-2">Your promo code</div>
      <div className="font-head text-2xl font-extrabold tracking-[0.06em]">{PLACEHOLDER}</div>
      <button
        type="button"
        onClick={reveal}
        disabled={pending}
        className="h-[52px] self-stretch rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em] disabled:opacity-60"
      >
        {pending ? 'Revealing…' : 'Reveal code'}
      </button>
      {error && <div className="text-[13px] font-semibold text-[#FF8A7A]">{error}</div>}
    </div>
  );
}
