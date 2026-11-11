import { cn } from '@/lib/cn';

/**
 * A shimmering placeholder block for loading states (route-level loading.tsx). Size, rounding and
 * spacing come from `className`; the sweep respects prefers-reduced-motion via globals.css.
 */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn('skeleton rounded-tile', className)} />;
}
