import { AppShell } from '@/components/layout/AppShell';
import { ConsentList } from '@/components/ui/ConsentList';
import { PrimaryButton, OutlineButton } from '@/components/ui/Button';

/** D2 · Offers — turn on personal offers (default off, docs/product-spec.md section 12). */
export default function OffersConsent() {
  return (
    <AppShell back="/offers" title="Personal offers">
      <div className="space-y-6 pt-2">
        <p className="text-sm text-ink-2">
          Turn on personalised offers to get cashback and promo codes matched to your activity.
        </p>
        <ConsentList
          weRead={['Your axis scores', 'Which services you connected', 'Your country']}
          weNever={[
            'Your health data',
            'Your wallet balances',
            'Your personal data (shared with partners)',
          ]}
        />
        <div className="space-y-3">
          <PrimaryButton href="/offers">Turn on</PrimaryButton>
          <OutlineButton href="/offers">Not now</OutlineButton>
        </div>
      </div>
    </AppShell>
  );
}
