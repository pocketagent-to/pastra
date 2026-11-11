import { NextResponse } from 'next/server';
import { getConfig } from '@pastra/config';
import { verifyTerraSignature } from '@pastra/providers';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/terra — Terra (tryterra.co) delivery webhook (docs/architecture.md §7).
 *
 * Terra signs every delivery with `terra-signature: t=<ts>,v1=<hmac>` (HMAC-SHA256 over
 * `"<t>.<rawBody>"`). We verify the signature and acknowledge; a user's metrics are pulled on the
 * next scheduled sync via the Terra adapter, so the webhook only needs to confirm receipt. The
 * body is never logged (it carries health metrics — docs/architecture.md §14).
 */
export async function POST(request: Request) {
  const secret = getConfig().TERRA_SIGNING_SECRET;
  if (!secret) {
    // Not configured yet: do not accept unverifiable deliveries.
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get('terra-signature');
  if (!verifyTerraSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: 'bad_signature' }, { status: 401 });
  }

  // Signature valid: acknowledge. Data is read on the next scheduled sync, keyed by Terra user_id.
  return NextResponse.json({ ok: true });
}
