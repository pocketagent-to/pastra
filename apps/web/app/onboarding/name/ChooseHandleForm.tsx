'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/ui/Button';

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

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center rounded-button border border-divider bg-panel px-3">
          <span className="text-ink-3">@</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.toLowerCase())}
            placeholder="yourname"
            className="w-full bg-transparent p-3 outline-none"
            autoFocus
          />
        </div>
        {result && !loading && (
          <p className={`mt-1 text-xs ${result.available ? 'text-green' : 'text-orange-light'}`}>
            {result.available ? 'Available' : REASON_TEXT[result.reason ?? 'invalid']}
          </p>
        )}
      </div>

      {result && !result.available && result.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {result.suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setName(s)}
              className="rounded-chip border border-divider bg-white/5 px-3 py-1 text-sm"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {submitError && <p className="text-xs text-orange-light">{submitError}</p>}

      <PrimaryButton type="button" onClick={claim} disabled={!result?.available || submitting}>
        {submitting ? 'Saving…' : 'Continue'}
      </PrimaryButton>
    </div>
  );
}
