import { ping } from '@pastra/db';
import { getDb } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * GET /api/health — liveness. Checks the database with a cheap `select 1`. The queue runs in the
 * worker process, not here (serverless web holds no pg-boss instance), so this route is honestly
 * database-only; the worker reports its own liveness through its logs.
 */
export async function GET() {
  const checks: Record<string, 'ok' | 'error'> = { db: 'error' };
  try {
    await ping(getDb());
    checks.db = 'ok';
  } catch {
    checks.db = 'error';
  }
  const ok = Object.values(checks).every((v) => v === 'ok');
  return Response.json({ ok, checks }, { status: ok ? 200 : 503 });
}
