import { cn } from '@/lib/cn';

/** A stamp chip (design/Main.html): white-bordered pill when earned, dashed grey when not. */
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
      data-new={isNew ? '' : undefined}
      className={cn(
        'inline-flex items-center rounded-[12px] border-[1.5px] px-3.5 py-[9px] text-[13px] font-semibold',
        earned ? 'border-white text-ink' : 'border-dashed border-[#6B7080] text-ink-3',
      )}
    >
      {label}
    </span>
  );
}
