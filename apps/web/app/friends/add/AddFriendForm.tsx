'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

const MESSAGES: Record<string, string> = {
  not_found: 'No one has this code. Check it with your friend, or ask them for a new one.',
  invalid: "That's your own code.",
  already_linked: "You're already friends.",
};

/** The "enter a friend's code" form (design/AddFriend.html); posts to /api/friends/add. */
export function AddFriendForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/friends/add', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ code }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirect?: string;
        error?: { code?: string };
      };
      if (data.ok && data.redirect) {
        router.push(data.redirect);
        router.refresh();
        return;
      }
      setError(MESSAGES[data.error?.code ?? ''] ?? 'Something went wrong. Try again.');
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2.5">
      <label htmlFor="friend-code" className="font-head text-[13px] font-bold tracking-[0.05em]">
        Enter a friend&apos;s code
      </label>
      <div className="flex gap-2">
        <input
          id="friend-code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ABCDEF"
          maxLength={6}
          autoCapitalize="characters"
          autoComplete="off"
          className="h-[54px] min-w-0 flex-1 rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 font-head text-xl font-bold uppercase tracking-[0.3em]"
        />
        <button
          type="submit"
          disabled={busy}
          className="h-[54px] rounded-button border-[1.5px] border-white px-5 font-semibold disabled:opacity-40"
        >
          Find
        </button>
      </div>
      <p className="text-[13px] leading-[1.5] text-ink-3">6 characters, letters and numbers.</p>
      {error && <p className="text-[13px] leading-[1.5] text-[#FF8A7A]">{error}</p>}
    </form>
  );
}
