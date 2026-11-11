import { PgBoss } from 'pg-boss';
import { directDatabaseUrl } from '@pastra/config';
import { addWeeks, currentWeek, pruneExpired } from '@pastra/core';
import { createDeps } from './deps';
import { runDrop } from './drop-chain';
import { captureError, logEvent } from './log';

const DROP_QUEUE = 'drop.run';
const RETENTION_QUEUE = 'retention.run';
/** Daily retention sweep at 03:00 UTC (jittered minute). */
const RETENTION_CRON = '12 3 * * *';

/** Compute the parameters for the drop happening now: the new live week and the one it closes. */
function dropParams(now: Date = new Date()) {
  const week = currentWeek(now);
  return { week, prevWeek: addWeeks(week, -1), dropAt: now };
}

async function main(): Promise<void> {
  const deps = createDeps();

  // pg-boss and migrations need a DIRECT session connection (LISTEN/NOTIFY, advisory locks). If the
  // resolved direct url is actually the pgbouncer pooler, fail fast with an actionable message
  // instead of starting and silently misbehaving (set DATABASE_URL_UNPOOLED to the non-pooler url).
  const directUrl = directDatabaseUrl(deps.config);
  if (/-pooler\./.test(directUrl) || directUrl.includes('pgbouncer')) {
    throw new Error(
      'Worker requires the DIRECT database endpoint: set DATABASE_URL_UNPOOLED to the non-pooler ' +
        'Neon url. pg-boss cannot run on the pgbouncer transaction pooler.',
    );
  }

  logEvent('worker_start', {
    env: deps.config.NODE_ENV,
    card: deps.config.CARD_PROVIDER,
    providers: deps.catalog.providers.length,
  });

  // One-shot manual drop for staging: `pnpm --filter @pastra/worker start drop`.
  if (process.argv[2] === 'drop') {
    const started = performance.now();
    const result = await runDrop(deps, dropParams());
    logEvent('drop_complete', { ...result, durationMs: Math.round(performance.now() - started) });
    process.exit(0);
  }

  const boss = new PgBoss(directUrl);
  boss.on('error', (error: unknown) => captureError('pg_boss_error', error));
  await boss.start();
  await boss.createQueue(DROP_QUEUE);
  await boss.createQueue(RETENTION_QUEUE);

  await boss.work(DROP_QUEUE, async (jobs: { id: string }[]) => {
    for (const job of jobs) {
      const started = performance.now();
      try {
        const result = await runDrop(deps, dropParams());
        logEvent('drop_published', {
          jobId: job.id,
          ...result,
          durationMs: Math.round(performance.now() - started),
        });
      } catch (error) {
        captureError('drop_failed', error, { jobId: job.id });
        throw error; // let pg-boss retry (steps are idempotent)
      }
    }
  });

  await boss.work(RETENTION_QUEUE, async (jobs: { id: string }[]) => {
    for (const job of jobs) {
      const started = performance.now();
      try {
        const result = await pruneExpired(deps.db);
        logEvent('retention_done', {
          jobId: job.id,
          ...result,
          durationMs: Math.round(performance.now() - started),
        });
      } catch (error) {
        captureError('retention_failed', error, { jobId: job.id });
        throw error;
      }
    }
  });

  // Schedule the weekly drop (Monday 13:00 Europe/Warsaw by default, docs/architecture.md section 9).
  // expireInSeconds raises the 15-min default lease so the long drop job is not marked expired;
  // retryBackoff retries a transient failure a couple of times (the steps are idempotent).
  await boss.schedule(
    DROP_QUEUE,
    deps.config.DROP_CRON,
    {},
    { tz: deps.config.DROP_TZ, retryLimit: 2, retryBackoff: true, expireInSeconds: 3600 },
  );
  await boss.schedule(RETENTION_QUEUE, RETENTION_CRON, {}, { retryLimit: 2, retryBackoff: true });
  logEvent('drop_scheduled', { cron: deps.config.DROP_CRON, tz: deps.config.DROP_TZ });

  const shutdown = async (signal: string): Promise<void> => {
    logEvent('worker_stopping', { signal });
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  captureError('worker_fatal', error);
  process.exit(1);
});
