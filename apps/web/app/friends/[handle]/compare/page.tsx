import { AppShell } from '@/components/layout/AppShell';
import { Hexagon } from '@/components/ui/Hexagon';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { AXIS_LABEL } from '@/lib/axes';
import { HEX_AXIS_ORDER } from '@/lib/hexagon';
import { axesValues } from '@/lib/example';

const FRIEND: Record<string, number> = {
  gaming: 70,
  crypto: 55,
  music: 80,
  social: 44,
  lifestyle: 30,
  sports: 0,
};

/** E5 · Compare two passes (docs/product-spec.md section 12). */
export default async function Compare({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const mine = axesValues();
  return (
    <AppShell back={`/friends/${handle}`} title={`vs ${handle}`}>
      <div className="space-y-6 pt-2">
        <div className="flex justify-center">
          <Hexagon values={mine} compare={FRIEND} size={300} />
        </div>
        <div className="flex justify-center gap-4 text-xs">
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 rounded-full bg-purple" /> You
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-4 rounded-full border border-dashed border-[#7C9BFF]" /> {handle}
          </span>
        </div>

        <div className="divide-y divide-divider rounded-panel border border-divider bg-panel">
          {HEX_AXIS_ORDER.map((axis) => (
            <div key={axis} className="flex items-center justify-between p-3 text-sm">
              <span className="text-ink-2">{AXIS_LABEL[axis]}</span>
              <span className="font-head font-bold tabular-nums">
                {mine[axis]} <span className="text-ink-3">vs</span> {FRIEND[axis] ?? '—'}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <PrimaryButton href="/share">Post the comparison</PrimaryButton>
          <OutlineButton href="/friends/add">Invite another</OutlineButton>
        </div>
      </div>
    </AppShell>
  );
}
