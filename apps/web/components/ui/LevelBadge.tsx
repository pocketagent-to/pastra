import { cn } from '@/lib/cn';

/** The "LVL 27" badge shown on the pass, card and share images (design/Main.html): solid orange. */
export function LevelBadge({
  level,
  muted = false,
  className,
}: {
  level: number;
  muted?: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-[10px] px-3 py-1.5 font-head text-[13px] font-bold',
        muted ? 'bg-divider text-ink-3' : 'bg-orange text-on-orange',
        className,
      )}
    >
      LVL {level}
    </span>
  );
}
