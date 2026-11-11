'use client';

import { useMemo, useState } from 'react';
import { cn } from '@/lib/cn';
import { Toggle } from '@/components/ui/Toggle';

const FORMATS = [
  { key: 'x', label: 'X post', ratio: '16 / 9' },
  { key: 'story', label: 'Story', ratio: '9 / 16' },
  { key: 'square', label: 'Square', ratio: '1 / 1' },
] as const;
type FormatKey = (typeof FORMATS)[number]['key'];

const SHOW_ITEMS = [
  { key: 'hex', label: 'Hexagon' },
  { key: 'level', label: 'Level and title' },
  { key: 'numbers', label: 'Top numbers' },
  { key: 'stamps', label: 'Stamps' },
] as const;

type ShowState = {
  hex: boolean;
  level: boolean;
  numbers: boolean;
  stamps: boolean;
  sports: boolean;
};

/** B7 · Share — interactive: pick a format and what to show, then post / copy / save (spec §11). */
export function ShareClient({ handle }: { handle: string }) {
  const [format, setFormat] = useState<FormatKey>('x');
  const [show, setShow] = useState<ShowState>({
    hex: true,
    level: true,
    numbers: true,
    stamps: false,
    sports: false,
  });
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);

  const safeHandle = handle || 'nomad';
  const imgSrc = useMemo(() => {
    const flags = (Object.keys(show) as Array<keyof ShowState>).filter((k) => show[k]).join(',');
    return `/og/${encodeURIComponent(safeHandle)}.png?v=${format}&show=${flags || 'none'}`;
  }, [show, format, safeHandle]);
  const ratio = FORMATS.find((f) => f.key === format)!.ratio;

  const publicUrl = () =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/${safeHandle}`;

  const postToX = () => {
    const text = 'My HEXTRA pass — six sides of my life in one hexagon.';
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(publicUrl())}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl());
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  const saveImage = async () => {
    setSaving(true);
    try {
      const res = await fetch(imgSrc);
      const blob = await res.blob();
      const file = new File([blob], `${safeHandle}-hextra.png`, { type: 'image/png' });
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      if (nav.canShare?.({ files: [file] }) && nav.share) {
        await nav.share({ files: [file], title: 'My HEXTRA pass' });
      } else {
        const href = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = href;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      }
    } catch {
      /* user cancelled the share sheet, or the fetch failed */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-[22px] pt-2">
      <div
        className="mx-auto w-full max-w-full overflow-hidden rounded-[20px] border border-divider bg-black"
        style={{ aspectRatio: ratio, maxHeight: '52vh' }}
      >
        {/* The real share card is generated at /og/{handle}.png; key forces a reload on change. */}
        <img
          key={imgSrc}
          src={imgSrc}
          alt="Share preview"
          className="h-full w-full object-contain"
        />
      </div>

      <section className="flex flex-col gap-3">
        <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">Format</div>
        <div className="grid grid-cols-3 gap-2">
          {FORMATS.map((f) => {
            const active = f.key === format;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={active}
                onClick={() => setFormat(f.key)}
                className={cn(
                  'h-12 rounded-[14px] text-sm font-semibold text-ink transition-colors',
                  active ? 'bg-blue' : 'border-[1.5px] border-ink bg-transparent',
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <div className="font-head text-[13px] font-bold uppercase tracking-[0.05em]">
          What to show
        </div>
        <div className="flex flex-col rounded-panel bg-panel px-4">
          {SHOW_ITEMS.map((s, i) => (
            <div
              key={s.key}
              className={cn(
                'flex min-h-[52px] items-center justify-between gap-3 text-[15px]',
                i > 0 && 'border-t border-divider',
              )}
            >
              <span>{s.label}</span>
              <Toggle
                label={s.label}
                defaultOn={show[s.key]}
                onChange={(on) => setShow((prev) => ({ ...prev, [s.key]: on }))}
              />
            </div>
          ))}
          <div className="flex min-h-[60px] items-center justify-between gap-3 border-t border-divider text-[15px]">
            <span className="flex flex-col gap-0.5">
              Sports side
              <span className="text-xs text-ink-3">Health data is hidden by default</span>
            </span>
            <Toggle
              label="Sports side"
              defaultOn={show.sports}
              onChange={(on) => setShow((prev) => ({ ...prev, sports: on }))}
            />
          </div>
        </div>
      </section>

      <div className="mt-auto flex flex-col gap-2.5">
        <button
          type="button"
          onClick={postToX}
          className="flex h-14 items-center justify-center rounded-button bg-orange font-head text-sm font-bold uppercase tracking-[0.03em] text-on-orange"
        >
          Post to X
        </button>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={copyLink}
            className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink bg-transparent font-head text-xs font-bold uppercase tracking-[0.03em] text-ink"
          >
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <button
            type="button"
            onClick={saveImage}
            disabled={saving}
            className="flex h-[52px] items-center justify-center rounded-button border-[1.5px] border-ink bg-transparent font-head text-xs font-bold uppercase tracking-[0.03em] text-ink disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save image'}
          </button>
        </div>
      </div>
    </div>
  );
}
