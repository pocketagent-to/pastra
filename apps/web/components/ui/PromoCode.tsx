'use client';

import { useState } from 'react';

/** A promo code with a copy button (docs/product-spec.md section 8). */
export function PromoCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="flex w-full items-center justify-between rounded-button border border-dashed border-divider bg-white/5 px-4 py-3 font-mono text-lg tracking-wider"
    >
      <span>{code}</span>
      <span className="text-sm font-semibold text-orange-light">{copied ? 'Copied' : 'Copy'}</span>
    </button>
  );
}
