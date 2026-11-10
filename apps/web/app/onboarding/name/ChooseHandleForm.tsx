'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

interface CheckResult {
  available: boolean;
  reason?: 'taken' | 'invalid' | 'reserved';
  suggestions: string[];
}

const REASON_TEXT: Record<string, string> = {
  taken: 'That name is taken.',
  invalid: '3–20 characters, lowercase letters, digits or underscore.',
  reserved: 'That name is reserved.',
};

const SUBMIT_ERROR_TEXT: Record<string, string> = {
  handle_taken: 'That name is taken.',
  handle_invalid: '3–20 characters, lowercase letters, digits or underscore.',
  handle_reserved: 'That name is reserved.',
  forbidden: 'You can only change your name once every 30 days.',
};

/** A3/A4 · Pick your name — availability checked as you type (docs/product-spec.md section 12). */
export function ChooseHandleForm() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (name.length < 3) {
      setResult(null);
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/handle/check?name=${encodeURIComponent(name)}`);
        setResult((await res.json()) as CheckResult);
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(id);
  }, [name]);

  /** Persist the handle, then advance to the first-service step. */
  async function claim() {
    if (!result?.available || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/me/handle', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (res.ok) {
        router.push('/start');
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      setSubmitError(
        SUBMIT_ERROR_TEXT[data.error?.code ?? ''] ?? 'Could not save your name. Try again.',
      );
      setSubmitting(false);
    } catch {
      setSubmitError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  const available = result?.available === true;
  const unavailable = result != null && !loading && !result.available;
  const inputBorder =
    result && !loading
      ? result.available
        ? 'border-green'
        : 'border-[#FF8A7A]'
      : 'border-[#4A4E5A]';
  const canContinue = Boolean(result?.available) && !submitting;

  return (
    <div className="flex flex-1 flex-col gap-[22px]">
      <div className="flex flex-col gap-2.5">
        <label htmlFor="handle" className="text-[13px] font-semibold text-ink-2">
          Name
        </label>
        <div
          className={`flex h-[54px] items-center rounded-button border-[1.5px] bg-panel px-4 ${inputBorder}`}
        >
          <span className="whitespace-nowrap text-[15px] text-ink-3">[your-domain]/</span>
          <input
            id="handle"
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="yourname"
            autoComplete="off"
            className="h-full min-w-0 flex-grow bg-transparent text-[15px] font-semibold text-ink outline-none"
            autoFocus
          />
        </div>
        {result && !loading && available && (
          <div className="flex items-center gap-2 text-[13px] font-semibold text-green">
            <svg
              viewBox="0 0 24 24"
              width="18"
              height="18"
              aria-hidden="true"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="shrink-0"
            >
              <path d="M5 12.5l4.5 4.5L19 7.5" />
            </svg>
            {name} is free
          </div>
        )}
        {unavailable && (
          <div className="text-[13px] font-semibold text-[#FF8A7A]">
            {result.reason === 'taken'
              ? `${name} is taken. Pick one below or try another.`
              : REASON_TEXT[result.reason ?? 'invalid']}
          </div>
        )}
        <div className="text-[13px] leading-relaxed text-ink-3">
          3 to 20 characters: a to z, 0 to 9 and underscore.
        </div>
      </div>

      {unavailable && result.suggestions.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="font-head text-[13px] font-bold tracking-[0.05em]">FREE RIGHT NOW</div>
          <div className="flex flex-wrap gap-2">
            {result.suggestions.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setName(s)}
                className="min-h-11 rounded-chip border-[1.5px] border-white px-4 text-[14px] font-semibold"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {submitError && <p className="text-[13px] font-semibold text-[#FF8A7A]">{submitError}</p>}

      <div className="mt-auto flex flex-col gap-2.5">
        <button
          type="button"
          onClick={claim}
          disabled={!canContinue}
          className={
            canContinue
              ? 'flex h-14 items-center justify-center rounded-button font-head text-[14px] font-bold uppercase tracking-[0.03em] text-on-orange'
              : 'flex h-14 items-center justify-center rounded-button bg-divider font-head text-[14px] font-bold uppercase tracking-[0.03em] text-ink-3'
          }
          style={canContinue ? { background: 'var(--grad-button)' } : undefined}
        >
          {submitting ? 'Saving…' : 'Continue'}
        </button>
        <div className="text-center text-[13px] leading-relaxed text-ink-3">
          You can change it later in your profile.
        </div>
      </div>
    </div>
  );
}
