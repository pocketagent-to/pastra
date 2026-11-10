'use client';

import { useState } from 'react';
import { cn } from '@/lib/cn';

/** An accessible on/off switch (Settings, visibility, consents). */
export function Toggle({
  label,
  defaultOn = false,
  onChange,
}: {
  label?: string;
  defaultOn?: boolean;
  onChange?: (on: boolean) => void;
}) {
  const [on, setOn] = useState(defaultOn);
  const toggle = () => {
    const next = !on;
    setOn(next);
    onChange?.(next);
  };
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={toggle}
      className={cn(
        'relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors',
        on ? 'bg-blue' : 'bg-white/15',
      )}
    >
      <span
        className={cn(
          'inline-block h-5 w-5 transform rounded-full bg-white transition-transform',
          on ? 'translate-x-6' : 'translate-x-1',
        )}
      />
    </button>
  );
}
