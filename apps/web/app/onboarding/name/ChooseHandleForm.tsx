'use client';

import { useEffect, useState } from 'react';
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

/** A3/A4 · Pick your name — availability checked as you type (docs/product-spec.md section 12). */
export function ChooseHandleForm() {
  const [name, setName] = useState('');
  const [result, setResult] = useState<CheckResult | null>(null);
  const [loading, setLoading] = useState(false);

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

      <PrimaryButton href={result?.available ? '/start' : undefined} disabled={!result?.available}>
        Continue
      </PrimaryButton>
    </div>
  );
}
