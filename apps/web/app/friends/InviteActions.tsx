'use client';

import { useState } from 'react';

/**
 * "Copy invite link" — copies the invite link to the clipboard (design/Friends.html,
 * FriendsEmpty.html). The resting label stays verbatim; a copy shows brief confirmation.
 */
export function CopyInviteButton({ link, className }: { link: string; className: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard API unavailable (e.g. insecure context): leave the label unchanged.
    }
  }

  return (
    <button type="button" onClick={copy} className={className} aria-live="polite">
      {copied ? 'Link copied' : 'Copy invite link'}
    </button>
  );
}

/**
 * "Remind" — nudges a pending invite via POST /api/friends/remind (design/Friends.html). Sending is
 * out of scope; this records the reminder and reflects the once/day rate limit back to the user.
 */
export function RemindButton({ inviteId, className }: { inviteId: string; className: string }) {
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'limited'>('idle');

  async function remind() {
    if (state === 'sending' || state === 'done') return;
    setState('sending');
    try {
      const res = await fetch('/api/friends/remind', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ inviteId }),
      });
      if (res.ok) {
        setState('done');
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
      setState(data.error?.code === 'rate_limited' ? 'limited' : 'idle');
    } catch {
      setState('idle');
    }
  }

  const label =
    state === 'done'
      ? 'Reminded'
      : state === 'limited'
        ? 'Already reminded'
        : state === 'sending'
          ? 'Reminding…'
          : 'Remind';

  return (
    <button
      type="button"
      onClick={remind}
      disabled={state === 'sending' || state === 'done'}
      className={className}
    >
      {label}
    </button>
  );
}
