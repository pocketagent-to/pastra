import { AppShell } from '@/components/layout/AppShell';
import { ServiceLogo } from '@/components/ui/ServiceLogo';
import { requireUser } from '@/lib/data';
import { AppleMusicConnect } from './AppleMusicConnect';

export const dynamic = 'force-dynamic';

/**
 * C3b · Apple Music connect. The begin route sends apple_music here with ?state= because Apple has no
 * OAuth redirect — the Music User Token is minted in the browser (docs/architecture.md section 7).
 *
 * The MusicKit developer token is server-only (APPLE_MUSIC_KEY, never NEXT_PUBLIC): this server
 * component reads it from the environment and passes it to the client component as a prop, so it is
 * sent with the page rather than inlined into the client bundle. Without it, there is nothing to
 * configure MusicKit with, so the screen shows a configuration-needed message.
 */
export default async function AppleMusicConnectPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  await requireUser();
  const { state } = await searchParams;
  const developerToken = process.env.APPLE_MUSIC_KEY ?? '';

  return (
    <AppShell back="/services" title="Apple Music">
      <div className="space-y-6 pt-2">
        <div className="flex items-center gap-3">
          <ServiceLogo provider="apple_music" name="Apple Music" size={48} />
          <div>
            <div className="font-head text-lg font-bold">Apple Music</div>
            <div className="text-xs text-ink-3">Official authorisation, read-only.</div>
          </div>
        </div>

        {developerToken ? (
          <AppleMusicConnect developerToken={developerToken} state={state ?? ''} />
        ) : (
          <div className="rounded-panel border border-divider bg-panel p-4 text-sm text-ink-2">
            Apple Music sign-in is not configured yet.
          </div>
        )}
      </div>
    </AppShell>
  );
}
