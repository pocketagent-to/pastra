'use client';

import { useState, type ReactNode } from 'react';

type PromoCodeVariant = 'inline' | 'box' | 'tiles';

/** A promo / friend code with copy-to-clipboard (docs/product-spec.md section 8). */
export function PromoCode({
  code,
  variant = 'inline',
  caption = variant === 'box' ? 'Your promo code' : undefined,
}: {
  code: string;
  /**
   * 'inline' (default) — compact dashed row with inline Copy (unchanged legacy look).
   * 'box' — OfferDetail dashed-orange card: caption, large centred code, full-width "Copy code".
   * 'tiles' — AddFriend per-character gradient tiles.
   */
  variant?: PromoCodeVariant;
  /** Caption above the code. Defaults to "Your promo code" for 'box'; none otherwise. Pass null to hide. */
  caption?: ReactNode;
}) {
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

  if (variant === 'tiles') {
    return (
      <div className="flex flex-col gap-3">
        {caption && (
          <div className="font-head text-[13px] font-bold tracking-[0.05em]">{caption}</div>
        )}
        <div
          aria-label={`Your code ${code.split('').join(' ')}`}
          className="grid grid-cols-6 gap-1.5"
        >
          {code.split('').map((ch, i) => (
            <span
              key={`${ch}-${i}`}
              className="flex h-14 items-center justify-center rounded-chip font-head text-[22px] font-bold text-ink"
              style={{ background: 'linear-gradient(160deg,#3D6BFF 0%,#6A3DFF 100%)' }}
            >
              {ch}
            </span>
          ))}
        </div>
        <button
          type="button"
          onClick={copy}
          className="h-12 rounded-[14px] bg-orange text-sm font-bold text-on-orange"
        >
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
    );
  }

  if (variant === 'box') {
    return (
      <div className="flex flex-col items-center gap-3.5 rounded-panel border-2 border-dashed border-orange p-5">
        {caption && <div className="text-[13px] text-ink-2">{caption}</div>}
        <div className="font-head text-2xl font-extrabold tracking-[0.06em]">{code}</div>
        <button
          type="button"
          onClick={copy}
          className="h-[52px] self-stretch rounded-button border-[1.5px] border-white font-head text-[13px] font-bold uppercase tracking-[0.03em]"
        >
          {copied ? 'Copied' : 'Copy code'}
        </button>
      </div>
    );
  }

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
