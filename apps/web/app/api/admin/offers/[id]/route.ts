import { updateOffer, isAdmin, CoreError, type OfferInput } from '@pastra/core';
import { getConfig } from '@pastra/config';
import { getDb } from '@/lib/server';
import { getSessionUser } from '@/lib/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Coerce a JSON request body into an {@link OfferInput}; core validates enums and the rule. */
function toInput(body: Record<string, unknown>): OfferInput {
  return {
    merchantName: typeof body.merchantName === 'string' ? body.merchantName : '',
    type: body.type as OfferInput['type'],
    axis: typeof body.axis === 'string' ? body.axis : '',
    headline: typeof body.headline === 'string' ? body.headline : '',
    terms: typeof body.terms === 'string' ? body.terms : null,
    rule: (body.rule as OfferInput['rule']) ?? { all: [] },
    priority: typeof body.priority === 'number' ? body.priority : Number(body.priority) || 0,
    countries: Array.isArray(body.countries) ? (body.countries as string[]) : null,
    startsWeek: typeof body.startsWeek === 'string' ? body.startsWeek : null,
    endsWeek: typeof body.endsWeek === 'string' ? body.endsWeek : null,
    codeMode: (body.codeMode as OfferInput['codeMode']) ?? null,
    sharedCode: typeof body.sharedCode === 'string' ? body.sharedCode : null,
    rate: typeof body.rate === 'string' ? body.rate : null,
    active: typeof body.active === 'boolean' ? body.active : true,
  };
}

async function handle(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: { code: 'forbidden' } }, { status: 401 });
  if (!isAdmin(getConfig(), user))
    return Response.json({ error: { code: 'forbidden' } }, { status: 403 });

  const { id } = await ctx.params;
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  try {
    await updateOffer(getDb(), id, toInput(body));
    return Response.json({ ok: true, id });
  } catch (error) {
    if (error instanceof CoreError) {
      return Response.json({ error: { code: error.code } }, { status: 400 });
    }
    throw error;
  }
}

/** POST /api/admin/offers/{id} — update an offer (admin only). */
export async function POST(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(request, ctx);
}

/** PUT /api/admin/offers/{id} — update an offer (admin only). */
export async function PUT(request: Request, ctx: { params: Promise<{ id: string }> }) {
  return handle(request, ctx);
}
