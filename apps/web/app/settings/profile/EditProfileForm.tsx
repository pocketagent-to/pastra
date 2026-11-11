'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Axis } from '@pastra/catalog';
import { AXIS_SHORT } from '@/lib/axes';

type VisLevel = 'everyone' | 'friends' | 'me';

/** Axis order and labels follow EditProfile.html (Sports first, short labels). */
const AXIS_ORDER: Axis[] = ['sports', 'gaming', 'crypto', 'music', 'social', 'lifestyle'];

const LEVELS: { value: VisLevel; label: string }[] = [
  { value: 'everyone', label: 'Everyone' },
  { value: 'friends', label: 'Friends' },
  { value: 'me', label: 'Only me' },
];

const HANDLE_ERROR_TEXT: Record<string, string> = {
  handle_taken: 'That name is taken.',
  handle_invalid: '3–20 characters, lowercase letters, digits or underscore.',
  handle_reserved: 'That name is reserved.',
  forbidden: 'You can only change your name once every 30 days.',
};

export interface EditProfileInitial {
  displayName: string;
  handle: string;
  bio: string;
  visibility: Partial<Record<string, VisLevel>>;
  show: { level: boolean; stamps: boolean; numbers: boolean; bio: boolean };
}

function defaultLevel(axis: Axis): VisLevel {
  return axis === 'sports' ? 'me' : 'everyone';
}

/** B · Edit profile — name, bio, per-axis visibility and the "also on my pass" toggles. */
export function EditProfileForm({ initial }: { initial: EditProfileInitial }) {
  const router = useRouter();
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [handle, setHandle] = useState(initial.handle);
  const [bio, setBio] = useState(initial.bio);
  const [vis, setVis] = useState<Record<Axis, VisLevel>>(() => {
    const out = {} as Record<Axis, VisLevel>;
    for (const axis of AXIS_ORDER) out[axis] = initial.visibility[axis] ?? defaultLevel(axis);
    return out;
  });
  const [show, setShow] = useState(initial.show);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handleError, setHandleError] = useState<string | null>(null);

  const avatarInitial = (displayName || handle || '?').charAt(0).toUpperCase();

  async function post(url: string, data: unknown): Promise<Response> {
    return fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(data),
    });
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setError(null);
    setHandleError(null);
    try {
      if (handle !== initial.handle) {
        const res = await post('/api/me/handle', { name: handle });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { error?: { code?: string } };
          setHandleError(
            HANDLE_ERROR_TEXT[data.error?.code ?? ''] ?? 'Could not save your name. Try again.',
          );
          setSaving(false);
          return;
        }
      }

      await post('/api/me/profile', { displayName, bio });
      await post('/api/me/preferences', {
        showLevel: show.level,
        showStamps: show.stamps,
        showNumbers: show.numbers,
        showBio: show.bio,
      });
      for (const axis of AXIS_ORDER) {
        await post('/api/me/visibility', { axis, level: vis[axis] });
      }

      router.push('/settings');
      router.refresh();
    } catch {
      setError('Could not save. Try again.');
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-[22px] pt-2">
      <div className="flex items-center gap-4">
        <div
          aria-hidden="true"
          className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-full font-head text-[28px] font-extrabold text-white"
          style={{ background: 'linear-gradient(135deg,#FF6B2C,#C04DFF 55%,#3D6BFF)' }}
        >
          {avatarInitial}
        </div>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            className="min-h-11 rounded-chip border-[1.5px] border-white px-4 text-[14px] font-semibold"
          >
            Change photo
          </button>
          <div className="text-xs text-ink-3">Shown on your pass and to friends</div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ep-display" className="text-[13px] font-semibold text-ink-2">
          Display name
        </label>
        <input
          id="ep-display"
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          maxLength={40}
          className="h-[54px] rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 text-[15px] text-ink outline-none"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ep-handle" className="text-[13px] font-semibold text-ink-2">
          Name in your link
        </label>
        <input
          id="ep-handle"
          type="text"
          value={handle}
          onChange={(e) => setHandle(e.target.value.toLowerCase())}
          autoComplete="off"
          className="h-[54px] rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 text-[15px] text-ink outline-none"
        />
        <div className="text-xs leading-relaxed text-ink-3">
          [your-domain]/{handle} · can be changed once every 30 days
        </div>
        {handleError && <div className="text-[13px] font-semibold text-[#FF8A7A]">{handleError}</div>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="ep-bio" className="text-[13px] font-semibold text-ink-2">
          About you · 80 characters
        </label>
        <input
          id="ep-bio"
          type="text"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={80}
          className="h-[54px] rounded-button border-[1.5px] border-[#4A4E5A] bg-panel px-4 text-[15px] text-ink outline-none"
        />
      </div>

      <div className="flex flex-col gap-3">
        <div className="font-head text-[13px] font-bold tracking-[0.05em]">WHO SEES EACH SIDE</div>
        <div className="text-[13px] leading-relaxed text-ink-3">
          Everyone means your public pass. Friends means only people you added.
        </div>
        <div className="flex flex-col rounded-panel bg-panel px-4">
          {AXIS_ORDER.map((axis, i) => (
            <div
              key={axis}
              className={`flex min-h-14 items-center justify-between gap-2 text-[14px] font-semibold ${
                i > 0 ? 'border-t border-divider' : ''
              }`}
            >
              {AXIS_SHORT[axis]}
              <div
                role="group"
                aria-label={`Who sees ${AXIS_SHORT[axis]}`}
                className="grid w-[204px] shrink-0 grid-cols-3 gap-1 rounded-chip bg-black p-1"
              >
                {LEVELS.map((lvl) => {
                  const active = vis[axis] === lvl.value;
                  return (
                    <button
                      key={lvl.value}
                      type="button"
                      aria-pressed={active}
                      onClick={() => setVis((v) => ({ ...v, [axis]: lvl.value }))}
                      className={`min-h-9 rounded-[9px] text-[12px] font-semibold ${
                        active ? 'bg-blue text-white' : 'text-ink-3'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        <div className="text-[13px] leading-relaxed text-ink-3">
          Sports uses activity totals. It starts as Only me until you change it.
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <div className="font-head text-[13px] font-bold tracking-[0.05em]">ALSO ON MY PASS</div>
        <div className="flex flex-col rounded-panel bg-panel px-4">
          <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 text-[15px]">
            Level and title
            <input
              type="checkbox"
              checked={show.level}
              onChange={(e) => setShow((s) => ({ ...s, level: e.target.checked }))}
              className="h-[22px] w-[22px] accent-blue"
            />
          </label>
          <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 border-t border-divider text-[15px]">
            Stamps
            <input
              type="checkbox"
              checked={show.stamps}
              onChange={(e) => setShow((s) => ({ ...s, stamps: e.target.checked }))}
              className="h-[22px] w-[22px] accent-blue"
            />
          </label>
          <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 border-t border-divider text-[15px]">
            Top numbers
            <input
              type="checkbox"
              checked={show.numbers}
              onChange={(e) => setShow((s) => ({ ...s, numbers: e.target.checked }))}
              className="h-[22px] w-[22px] accent-blue"
            />
          </label>
          <label className="flex min-h-[52px] cursor-pointer items-center justify-between gap-3 border-t border-divider text-[15px]">
            About you
            <input
              type="checkbox"
              checked={show.bio}
              onChange={(e) => setShow((s) => ({ ...s, bio: e.target.checked }))}
              className="h-[22px] w-[22px] accent-blue"
            />
          </label>
        </div>
      </div>

      {error && <div className="text-[13px] font-semibold text-[#FF8A7A]">{error}</div>}

      <button
        type="button"
        onClick={save}
        disabled={saving}
        className="flex h-14 items-center justify-center rounded-button font-head text-[14px] font-bold uppercase tracking-[0.03em] text-on-orange"
        style={{ background: 'var(--grad-button)' }}
      >
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </div>
  );
}
