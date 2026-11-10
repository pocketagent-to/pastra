import { cn } from '@/lib/cn';

/** A stamp chip (achievement or service), with an optional "new this week" dot. */
export function StampBadge({
  label,
  isNew = false,
  earned = true,
}: {
  label: string;
  isNew?: boolean;
  earned?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip border px-2.5 py-1 text-xs font-semibold',
        earned
          ? 'border-divider bg-white/5 text-ink'
          : 'border-divider/60 bg-transparent text-ink-3',
      )}
    >
      {isNew && <span className="h-1.5 w-1.5 rounded-full bg-orange" aria-label="new" />}
      {label}
    </span>
  );
}
