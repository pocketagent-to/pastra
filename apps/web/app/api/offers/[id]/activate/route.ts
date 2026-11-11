import { activateUserOffer, CoreError, currentWeek } from '@pastra/core';
import { getCipher, getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * POST /api/offers/{id}/activate — activate a cashback offer (card required) or reveal a promo code
 * for the signed-in user (docs/product-spec.md section 12). On success returns the offer's new
 * state and, for a promo offer, the revealed code. The partner never learns who used it.
 */
export async function POST(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: { code: 'forbidden' } }, { status: 401 });

  const { id } = await ctx.params;
  try {
    const result = await activateUserOffer(
      { db: getDb(), cipher: getCipher() },
      { userId: user.id, offerId: id, week: currentWeek() },
    );
    return Response.json({ ok: true, state: result.state, code: result.code ?? null });
  } catch (error) {
    if (error instanceof CoreError) {
      return Response.json({ error: { code: error.code } }, { status: 400 });
    }
    throw error;
  }
}
