import { cn } from '@/lib/cn';

/** The "LVL 27" badge shown on the pass, card and share images. */
export function LevelBadge({ level, className }: { level: number; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-chip border border-divider bg-panel px-2.5 py-1 font-head text-sm font-bold',
        className,
      )}
    >
      LVL {level}
    </span>
  );
}
