import { Hexagon } from '@/components/ui/Hexagon';
import { GradientText } from '@/components/ui/GradientText';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** A10 · Reveal — the first result, shown once (docs/product-spec.md section 12). */
export default function Reveal() {
  return (
    <main
      className="app-shell flex min-h-dvh flex-col items-center justify-center gap-6 px-6 text-center"
      style={{ backgroundImage: 'var(--bg-reveal)' }}
    >
      <LevelBadge level={7} />
      <GradientText className="text-3xl font-extrabold">Gamer</GradientText>
      <Hexagon values={{ gaming: 94 }} size={300} />
      <p className="max-w-xs text-sm text-ink-2">
        Your Gaming side is live. Connect more services to fill the hexagon.
      </p>
      <div className="w-full max-w-xs space-y-3">
        <PrimaryButton href="/pass">Go to my pass</PrimaryButton>
        <OutlineButton href="/services">Connect another</OutlineButton>
      </div>
    </main>
  );
}
