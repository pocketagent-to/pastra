import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/me — profile, settings and sign-in methods for the current user. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { error: { code: 'forbidden', message: 'Not signed in' } },
      { status: 401 },
    );
  }
  return Response.json({
    handle: user.handle,
    displayName: user.displayName,
    country: user.country,
    offersConsent: user.offersConsent,
    notify: { telegram: user.notifyTelegram, email: user.notifyEmail },
    show: {
      level: user.showLevel,
      stamps: user.showStamps,
      numbers: user.showNumbers,
      bio: user.showBio,
    },
    peakPoints: user.peakPoints,
  });
}
