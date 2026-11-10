import { Hexagon } from '@/components/ui/Hexagon';
import { GradientText } from '@/components/ui/GradientText';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';
import { StatusChip } from '@/components/ui/StatusChip';
import { LevelBadge } from '@/components/ui/LevelBadge';
import { DropTimer } from '@/components/ui/DropTimer';
import { KeyNumber } from '@/components/ui/KeyNumber';
import { StampBadge } from '@/components/ui/StampBadge';
import { AxisRow } from '@/components/ui/AxisRow';
import { PartBar } from '@/components/ui/PartBar';
import { ServiceTile } from '@/components/ui/ServiceTile';
import { OfferCard } from '@/components/ui/OfferCard';
import { CardFace } from '@/components/card/CardFace';
import { Toggle } from '@/components/ui/Toggle';
import { Toast } from '@/components/ui/Toast';
import { Logo } from '@/components/brand/Logo';

const VALUES = {
  sports: 34,
  gaming: 94,
  crypto: 88,
  music: 52,
  social: 61,
  lifestyle: 27,
} as const;

/** Component gallery (docs/architecture.md section 17, stage 2 acceptance). */
export default function Showcase() {
  return (
    <div className="app-shell space-y-10 px-4 py-8">
      <section className="flex items-center justify-between">
        <Logo size={32} withWordmark />
        <div className="flex items-center gap-2">
          <LevelBadge level={27} />
          <StatusChip>Live</StatusChip>
        </div>
      </section>

      <section className="flex flex-col items-center gap-3">
        <Hexagon values={VALUES} />
        <GradientText className="text-xl font-extrabold">Gamer &amp; crypto veteran</GradientText>
      </section>

      <section>
        <DropTimer
          nextDropAt={new Date(Date.now() + 86_400_000 + 7_200_000).toISOString()}
          serverNow={new Date().toISOString()}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-head text-sm uppercase tracking-widest text-ink-3">Your numbers</h2>
        <KeyNumber value="2,140" label="hours in CS2" />
        <KeyNumber value="7" label="yrs in crypto" />
        <KeyNumber value="12.4K" label="followers" />
      </section>

      <section className="rounded-panel border border-divider bg-panel p-4">
        {(Object.keys(VALUES) as Array<keyof typeof VALUES>).map((axis) => (
          <AxisRow key={axis} axis={axis} score={VALUES[axis]} delta={axis === 'gaming' ? 3 : 0} />
        ))}
      </section>

      <section className="space-y-3 rounded-panel border border-divider bg-panel p-4">
        <PartBar label="Volume" value={96} />
        <PartBar label="Activity" value={88} />
        <PartBar label="Depth" value={97} />
      </section>

      <section className="flex flex-wrap gap-2">
        <StampBadge label="2,000+ hours" isNew />
        <StampBadge label="In crypto since 2019" />
        <StampBadge label="Full hexagon" />
        <StampBadge label="Card holder" earned={false} />
      </section>

      <section className="grid grid-cols-2 gap-2">
        <ServiceTile provider="steam" name="Steam" state="connected" />
        <ServiceTile provider="wallet_evm" name="EVM wallet" state="connect" />
        <ServiceTile provider="x" name="X" state="reconnect" />
        <ServiceTile provider="whoop" name="WHOOP" state="coming_soon" />
      </section>

      <section className="space-y-3">
        <OfferCard
          id="demo"
          merchant="[PARTNER A]"
          headline="8% back"
          axis="gaming"
          reason="Because you played 18 hours of CS2 this week"
          endsLabel="Ends Monday"
          type="cashback"
          state="available"
        />
        <OfferCard
          id="demo2"
          merchant="[PARTNER B]"
          headline="[RATE]"
          axis="crypto"
          type="cashback"
          state="locked"
        />
      </section>

      <section className="space-y-3">
        <CardFace name="nomad" level={27} rarity="rare" last4="4921" />
      </section>

      <section className="flex items-center justify-between rounded-panel border border-divider bg-panel p-4">
        <span className="text-sm">Count card activity in my pass</span>
        <Toggle defaultOn />
      </section>

      <section className="space-y-2">
        <Toast kind="success">Connected Steam</Toast>
        <Toast kind="info">You&rsquo;re offline. Showing saved data</Toast>
        <Toast kind="problem">Couldn&rsquo;t connect. Retry</Toast>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <PrimaryButton>Get your pass</PrimaryButton>
        <OutlineButton>See all services</OutlineButton>
      </section>
    </div>
  );
}
