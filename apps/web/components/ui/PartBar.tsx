import { cn } from '@/lib/cn';

/** A labelled 0–100 progress bar, used for axis parts (Volume / Activity / Depth). */
export function PartBar({
  label,
  value,
  className,
}: {
  label: string;
  value: number | null;
  className?: string;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={cn('space-y-1', className)}>
      <div className="flex justify-between text-xs text-ink-2">
        <span>{label}</span>
        <span className="tabular-nums">{value === null ? '—' : pct.toFixed(0)}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct}%`, background: 'var(--grad-hex)' }}
        />
      </div>
    </div>
  );
}
