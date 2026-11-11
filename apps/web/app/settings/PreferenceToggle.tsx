'use client';

import { useState } from 'react';
import { Toggle } from '@/components/ui/Toggle';

type PreferenceField =
  | 'offersConsent'
  | 'notifyTelegram'
  | 'notifyEmail'
  | 'showLevel'
  | 'showStamps'
  | 'showNumbers'
  | 'showBio';

/** A single Settings toggle that persists its one preference field to /api/me/preferences. */
export function PreferenceToggle({
  field,
  label,
  defaultOn = false,
}: {
  field: PreferenceField;
  label: string;
  defaultOn?: boolean;
}) {
  const [, setSaving] = useState(false);

  async function persist(on: boolean) {
    setSaving(true);
    try {
      await fetch('/api/me/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ [field]: on }),
      });
    } catch {
      // Best-effort: the toggle keeps the user's choice; it is retried on the next change.
    } finally {
      setSaving(false);
    }
  }

  return <Toggle label={label} defaultOn={defaultOn} onChange={persist} />;
}
