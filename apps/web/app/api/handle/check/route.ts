import { checkHandle } from '@pastra/core';
import { getDb } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/handle/check?name= — availability, reason (taken/invalid/reserved), suggestions. */
export async function GET(request: Request) {
  const name = new URL(request.url).searchParams.get('name') ?? '';
  const result = await checkHandle(getDb(), name);
  return Response.json(result);
}
