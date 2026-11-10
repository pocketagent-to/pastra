'use client';

import { useEffect, useState } from 'react';
import { PrimaryButton } from '@/components/ui/Button';

const STEPS = ['Hours played', 'Games owned', 'Recent activity', 'Achievements', 'Account age'];

/** A8 · Building the pass — found metrics appear one by one (docs/product-spec.md section 12). */
export default function Building() {
  const [found, setFound] = useState(0);
  useEffect(() => {
    if (found >= STEPS.length) return;
    const id = setTimeout(() => setFound((n) => n + 1), 700);
    return () => clearTimeout(id);
  }, [found]);

  return (
    <main className="app-shell flex min-h-dvh flex-col gap-6 px-6 py-12">
      <div className="space-y-2 text-center">
        <h1 className="font-head text-2xl font-extrabold">Building your pass…</h1>
        <p className="text-sm text-ink-2">Reading your activity. This takes a few seconds.</p>
      </div>

      <ul className="space-y-2">
        {STEPS.map((label, i) => (
          <li
            key={label}
            className="flex items-center gap-3 rounded-tile border border-divider bg-panel p-3"
          >
            <span className={i < found ? 'text-green' : 'text-ink-3'}>{i < found ? '✓' : '…'}</span>
            <span className={i < found ? '' : 'text-ink-3'}>{label}</span>
          </li>
        ))}
      </ul>

      <PrimaryButton href="/start/reveal" disabled={found < 1}>
        Show my pass
      </PrimaryButton>
    </main>
  );
}
