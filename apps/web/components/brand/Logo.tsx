import { cn } from '@/lib/cn';

/**
 * Hextra logo: the blue tile with a white hexagon and orange shape, used in every app header,
 * admin and share image. The card face uses a different mark (docs/architecture.md section 13).
 */
export function Logo({
  size = 28,
  withWordmark = false,
}: {
  size?: number;
  withWordmark?: boolean;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <img src="/brand/pastra-logo.svg" alt="Hextra" width={size} height={size} />
      {withWordmark && (
        <span className={cn('font-head text-lg font-extrabold tracking-tight')}>Hextra</span>
      )}
    </span>
  );
}
