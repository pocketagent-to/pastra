'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

/**
 * The confirm step for deleting an account (design/DeleteConfirm.html). The destructive button
 * stays disabled until the user types DELETE; on confirm it POSTs to /api/me/delete and follows the
 * returned redirect. "Keep my account" returns to settings unchanged.
 */
export function DeleteConfirmForm() {
  const router = useRouter();
  const [value, setValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmed = value === 'DELETE';

  async function remove() {
    if (!confirmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/me/delete', { method: 'POST' });
      if (res.ok) {
        const data = (await res.json().catch(() => ({}))) as { redirect?: string };
        router.push(data.redirect ?? '/signup');
        router.refresh();
        return;
      }
      setError('Could not delete your account. Try again.');
      setSubmitting(false);
    } catch {
      setError('Network error. Try again.');
      setSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-2.5">
        <label htmlFor="delete-confirm" className="text-[13px] font-semibold text-ink-2">
          Type DELETE to confirm
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="DELETE"
          autoComplete="off"
          className="h-[54px] rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 text-[15px] text-ink outline-none"
        />
      </div>

      {error && <p className="text-[13px] font-semibold text-[#FF8A7A]">{error}</p>}

      <div className="mt-auto flex flex-col gap-2.5">
        <button
          type="button"
          onClick={remove}
          disabled={!confirmed || submitting}
          className="flex h-14 items-center justify-center rounded-button border-[1.5px] border-[#FF8A7A] font-head text-[13px] font-bold uppercase tracking-[0.03em] text-[#FF8A7A] disabled:opacity-40"
        >
          {submitting ? 'Deleting…' : 'Delete my account'}
        </button>
        <Link
          href="/settings"
          className="flex h-14 items-center justify-center rounded-button bg-[#1F4BFF] font-head text-[14px] font-bold uppercase tracking-[0.03em] text-white"
        >
          Keep my account
        </Link>
      </div>
    </>
  );
}
