import { buildExport } from '@pastra/core';
import { requireUser } from '@/lib/data';
import { getDb } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/me/export — download the signed-in user's own data as JSON (docs/product-spec.md
 * section 14). POST is accepted too, since the Settings "Download my data" button submits a form.
 * The payload carries ids and providers only: no tokens, external ids or secrets.
 */
async function download(): Promise<Response> {
  const user = await requireUser();
  const data = await buildExport(getDb(), user.id);
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'content-disposition': 'attachment; filename="hextra-export.json"',
    },
  });
}

export async function GET(): Promise<Response> {
  return download();
}

export async function POST(): Promise<Response> {
  return download();
}
