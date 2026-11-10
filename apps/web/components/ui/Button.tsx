import Link from 'next/link';
import { cn } from '@/lib/cn';

type CommonProps = {
  children: React.ReactNode;
  className?: string;
  href?: string;
  type?: 'button' | 'submit';
  disabled?: boolean;
  onClick?: () => void;
};

const base =
  'inline-flex items-center justify-center gap-2 min-h-11 px-5 rounded-button font-head font-bold text-[15px] uppercase tracking-wide transition-opacity disabled:opacity-40 disabled:pointer-events-none';

/** Primary action: orange→pink gradient (docs/architecture.md section 13). */
export function PrimaryButton({ children, className, href, type, disabled, onClick }: CommonProps) {
  const cls = cn(base, 'text-on-orange w-full', className);
  const style = { background: 'var(--grad-button)' };
  if (href && !disabled) {
    return (
      <Link href={href} className={cls} style={style}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type ?? 'button'}
      className={cls}
      style={style}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

/** Secondary action: outlined, subtle surface. */
export function OutlineButton({ children, className, href, type, disabled, onClick }: CommonProps) {
  const cls = cn(base, 'w-full border border-divider text-ink bg-white/5', className);
  if (href && !disabled) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? 'button'} className={cls} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  );
}
