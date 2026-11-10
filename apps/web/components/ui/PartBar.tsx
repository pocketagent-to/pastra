import { cn } from '@/lib/cn';

/** A labelled 0–100 bar for axis parts (design/Category.html): solid blue fill on a grey track. */
export function PartBar({
  label,
  sublabel,
  value,
  className,
}: {
  label: string;
  sublabel?: string;
  value: number | null;
  className?: string;
}) {
  const pct = value === null ? 0 : Math.max(0, Math.min(100, value));
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex justify-between text-sm">
        <span>
          {label}
          {sublabel && <span className="text-ink-3"> · {sublabel}</span>}
        </span>
        <span className="font-head font-bold tabular-nums">
          {value === null ? '—' : pct.toFixed(0)}
        </span>
      </div>
      <div className="h-[10px] rounded-[5px] bg-divider">
        <div className="h-full rounded-[5px] bg-blue" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
