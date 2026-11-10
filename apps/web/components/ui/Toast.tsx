import { cn } from '@/lib/cn';

type ToastKind = 'success' | 'info' | 'problem';

const KIND_CLASS: Record<ToastKind, string> = {
  success: 'border-status/60 text-green',
  info: 'border-divider text-ink-2',
  problem: 'border-orange/60 text-orange-light',
};

/** A short message toast (docs/product-spec.md "Toasts"). Rendered declaratively; a client */
/* toaster host wires timing and dismissal in later stages. */
export function Toast({
  kind = 'info',
  children,
}: {
  kind?: ToastKind;
  children: React.ReactNode;
}) {
  return (
    <div
      role="status"
      className={cn('rounded-button border bg-panel px-4 py-3 text-sm shadow-lg', KIND_CLASS[kind])}
    >
      {children}
    </div>
  );
}
