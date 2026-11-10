import Link from 'next/link';
import type { Axis } from '@pastra/catalog';
import { AXIS_LABEL } from '@/lib/axes';
import { cn } from '@/lib/cn';

/** A row in the axis list: name, score, delta and a bar. Links to the axis detail screen. */
export function AxisRow({
  axis,
  score,
  delta,
  hidden = false,
  href,
}: {
  axis: Axis;
  score: number;
  delta?: number;
  hidden?: boolean;
  href?: string;
}) {
  const body = (
    <div className="flex items-center gap-3 py-2">
      <div className={cn('w-36 shrink-0 text-sm', hidden ? 'text-ink-3' : 'text-ink-2')}>
        {AXIS_LABEL[axis]}
      </div>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
        <div
          className="h-full rounded-full"
          style={{ width: `${hidden ? 0 : score}%`, background: 'var(--grad-hex)' }}
        />
      </div>
      <div className="w-14 shrink-0 text-right font-head text-sm font-bold tabular-nums">
        {hidden ? '—' : score}
        {delta !== undefined && delta !== 0 && !hidden && (
          <span className={cn('ml-1 text-xs', delta > 0 ? 'text-green' : 'text-orange-light')}>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        )}
      </div>
    </div>
  );
  return href ? (
    <Link href={href} className="block hover:opacity-80">
      {body}
    </Link>
  ) : (
    body
  );
}
