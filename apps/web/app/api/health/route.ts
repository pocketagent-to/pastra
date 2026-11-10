import { ping } from '@pastra/db';
import { getDb } from '@/lib/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET /api/health — liveness: database and queue (docs/architecture.md section 12). */
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
