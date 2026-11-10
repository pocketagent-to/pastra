import { cn } from '@/lib/cn';

type Variant = 'live' | 'neutral' | 'warning';

const styles: Record<Variant, string> = {
  live: 'text-on-orange',
  neutral: 'bg-white/8 text-ink-2',
  warning: 'bg-orange/15 text-orange-light',
};

/** Small status pill. The `live` variant is the green glowing chip from the mockups. */
export function StatusChip({
  children,
  variant = 'live',
  className,
}: {
  children: React.ReactNode;
  variant?: Variant;
  className?: string;
}) {
  const liveStyle =
    variant === 'live'
      ? { background: 'var(--color-status)', boxShadow: '0 0 18px rgba(46,204,113,0.45)' }
      : undefined;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-chip px-2.5 py-1 text-xs font-semibold',
        styles[variant],
        className,
      )}
      style={liveStyle}
    >
      {children}
    </span>
  );
}
