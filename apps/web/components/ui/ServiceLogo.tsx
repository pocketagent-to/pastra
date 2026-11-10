import type { ProviderId } from '@pastra/catalog';
import { logoSrc } from '@/lib/logos';
import { cn } from '@/lib/cn';

/** A service's logo, or a letter tile fallback (used for Card spend / the Pastra mark). */
export function ServiceLogo({
  provider,
  name,
  size = 40,
  className,
}: {
  provider: ProviderId;
  name: string;
  size?: number;
  className?: string;
}) {
  const src = logoSrc(provider);
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-xl object-cover', className)}
      />
    );
  }
  if (provider === 'card_spend') {
    return (
      <img
        src="/brand/pastra-logo.svg"
        alt={name}
        width={size}
        height={size}
        className={cn('rounded-xl', className)}
      />
    );
  }
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center rounded-xl bg-white/10 font-head font-bold',
        className,
      )}
      style={{ width: size, height: size }}
      aria-label={name}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}
