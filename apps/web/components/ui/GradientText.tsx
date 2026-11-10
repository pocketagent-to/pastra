import { cn } from '@/lib/cn';

/** Orange→purple→blue gradient text used for headline numbers and titles. */
export function GradientText({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <span className={cn('text-gradient font-head', className)}>{children}</span>;
}
