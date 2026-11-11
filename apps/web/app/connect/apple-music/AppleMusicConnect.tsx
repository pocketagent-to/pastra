'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PrimaryButton } from '@/components/ui/Button';

/**
 * Apple Music connect (MusicKit JS). Apple has no OAuth redirect: the Music User Token is minted in
 * the browser by MusicKit and handed to us once (packages/providers/src/adapters/appleMusic.ts). This
 * component loads MusicKit v3, configures it with the developer token (passed down from the server so
 * APPLE_MUSIC_KEY never ships in the client bundle), runs MusicKit.authorize() to get the Music User
 * Token, then POSTs { state, musicUserToken } to /api/connections/apple_music/verify and follows the
 * redirect (docs/architecture.md section 7).
 */

interface MusicKitInstance {
  authorize(): Promise<string>;
}

interface MusicKitNamespace {
  configure(cfg: {
    developerToken: string;
    app: { name: string; build: string };
  }): Promise<MusicKitInstance>;
  getInstance(): MusicKitInstance | undefined;
}

type WindowWithMusicKit = typeof globalThis & { MusicKit?: MusicKitNamespace };

const MUSICKIT_SRC = 'https://js-cdn.music.apple.com/musickit/v3/musickit.js';

const VERIFY_ERROR_TEXT: Record<string, string> = {
  bad_state: 'This link has expired. Start the connection again.',
  unexpected_response: 'Apple Music did not return a token. Try again.',
};

export function AppleMusicConnect({
  developerToken,
  state,
}: {
  developerToken: string;
  state: string;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load MusicKit JS once and configure it with the developer token.
  useEffect(() => {
    let cancelled = false;

    async function configure() {
      const mk = (window as WindowWithMusicKit).MusicKit;
      if (!mk) return;
      try {
        await mk.configure({ developerToken, app: { name: 'Pastra', build: '1.0.0' } });
        if (!cancelled) setReady(true);
      } catch {
        if (!cancelled) setError('Could not start Apple Music. Reload and try again.');
      }
    }

    if ((window as WindowWithMusicKit).MusicKit) void configure();
    const onLoaded = () => void configure();
    document.addEventListener('musickitloaded', onLoaded);

    if (!document.getElementById('musickit-js')) {
      const script = document.createElement('script');
      script.id = 'musickit-js';
      script.src = MUSICKIT_SRC;
      script.async = true;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      document.removeEventListener('musickitloaded', onLoaded);
    };
  }, [developerToken]);

  async function connect() {
    setError(null);
    const music = (window as WindowWithMusicKit).MusicKit?.getInstance();
    if (!music) {
      setError('Apple Music is still loading. Try again in a moment.');
      return;
    }
    setBusy(true);
    try {
      const musicUserToken = await music.authorize();
      const res = await fetch('/api/connections/apple_music/verify', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ state, musicUserToken }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        redirect?: string;
        error?: { code?: string };
      };
      if (res.ok && data.redirect) {
        router.push(data.redirect);
        router.refresh();
        return;
      }
      setBusy(false);
      setError(
        VERIFY_ERROR_TEXT[data.error?.code ?? ''] ?? 'Could not connect Apple Music. Try again.',
      );
    } catch {
      setBusy(false);
      setError('Apple Music sign-in was cancelled.');
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink-2">
        Apple Music opens a secure Apple sign-in. We read only counts — your library and playlist
        totals — never your listening history.
      </p>
      {error && <p className="text-[13px] font-semibold text-[#FF8A7A]">{error}</p>}
      <PrimaryButton onClick={connect} disabled={busy || !ready || !state}>
        {busy ? 'Connecting…' : ready ? 'Connect Apple Music' : 'Loading…'}
      </PrimaryButton>
    </div>
  );
}
