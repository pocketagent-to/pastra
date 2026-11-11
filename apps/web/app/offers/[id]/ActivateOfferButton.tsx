'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { OfferState } from '@pastra/core';

/**
 * D5 · Cashback "Activate" button. POSTs to the activate route (card required); on success the
 * offer becomes active and the page is refreshed. A missing card routes to the card flow. Layout
 * and the "Activate" label are kept verbatim from the mockup; the other labels are transient.
 */
export function ActivateOfferButton({ offerId, state }: { offerId: string; state: OfferState }) {
  const router = useRouter();
  const [activated, setActivated] = useState(state === 'activated');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function activate() {
    if (pending || activated) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/offers/${encodeURIComponent(offerId)}/activate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
      });
      const data = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      if (res.ok) {
        setActivated(true);
        router.refresh();
        return;
      }
      if (data.error?.code === 'card_required') {
        router.push('/card');
        return;
      }
      setError('Could not activate. Try again.');
      setPending(false);
    } catch {
      setError('Network error. Try again.');
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={activate}
        disabled={pending || activated}
        className="flex h-14 items-center justify-center rounded-button font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange disabled:opacity-60"
        style={{ background: 'var(--grad-button)' }}
      >
        {activated ? 'Activated' : pending ? 'Activating…' : 'Activate'}
      </button>
      {error && <p className="text-center text-[13px] font-semibold text-[#FF8A7A]">{error}</p>}
    </>
  );
}
