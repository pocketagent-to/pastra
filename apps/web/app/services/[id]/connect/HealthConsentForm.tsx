'use client';

import { useState } from 'react';
import type { ProviderId } from '@pastra/catalog';
import { PrimaryButton } from '@/components/ui/Button';

/** C4 · Health consent — the Continue button is inactive until the box is checked (scenario 4). */
export function HealthConsentForm({ providerId }: { providerId: ProviderId }) {
  const [agreed, setAgreed] = useState(false);
  const [showPublic, setShowPublic] = useState(false);

  return (
    <div className="space-y-4">
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5"
        />
        <span>
          I agree to share summary health data (totals only). Never my heart rate or weight.
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-ink-2">
        <input
          type="checkbox"
          checked={showPublic}
          onChange={(e) => setShowPublic(e.target.checked)}
          className="mt-0.5"
        />
        <span>Also show my Sports side on my public pass.</span>
      </label>
      <PrimaryButton
        href={agreed ? `/api/connections/${providerId}/begin?show_sports=${showPublic}` : undefined}
        disabled={!agreed}
      >
        Continue
      </PrimaryButton>
    </div>
  );
}
