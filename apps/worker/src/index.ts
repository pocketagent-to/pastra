import { PgBoss } from 'pg-boss';
import { directDatabaseUrl } from '@pastra/config';
import { addWeeks, currentWeek } from '@pastra/core';
import { createDeps } from './deps';
import { runDrop } from './drop-chain';

const DROP_QUEUE = 'drop.run';

function log(message: string): void {
  console.log(`[worker] ${message}`);
}

/** Compute the parameters for the drop happening now: the new live week and the one it closes. */
function dropParams(now: Date = new Date()) {
  const week = currentWeek(now);
  return { week, prevWeek: addWeeks(week, -1), dropAt: now };
}

async function main(): Promise<void> {
  const deps = createDeps();
  log(
    `starting · env=${deps.config.NODE_ENV} · card=${deps.config.CARD_PROVIDER} · providers=${deps.catalog.providers.length}`,
  );

  // One-shot manual drop for staging: `pnpm --filter @pastra/worker start drop`.
  if (process.argv[2] === 'drop') {
    const result = await runDrop(deps, dropParams());
    log(
      `drop complete · users=${result.users} connections=${result.connections} synced=${result.synced} failed=${result.failed}`,
    );
    process.exit(0);
  }

  // pg-boss must use the DIRECT endpoint (LISTEN/NOTIFY, advisory locks) — never the pgbouncer pooler.
  const boss = new PgBoss(directDatabaseUrl(deps.config));
  boss.on('error', (error: unknown) => log(`pg-boss error: ${(error as Error).message}`));
  await boss.start();
  await boss.createQueue(DROP_QUEUE);

  await boss.work(DROP_QUEUE, async (jobs: { id: string }[]) => {
    for (const job of jobs) {
      const started = performance.now();
      const result = await runDrop(deps, dropParams());
      log(
        `drop published · job=${job.id} users=${result.users} connections=${result.connections} synced=${result.synced} failed=${result.failed} durationMs=${Math.round(performance.now() - started)}`,
      );
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
  log(`scheduled drop · cron="${deps.config.DROP_CRON}" tz=${deps.config.DROP_TZ}`);

  const shutdown = async (signal: string): Promise<void> => {
    log(`${signal} received, stopping`);
    await boss.stop({ graceful: true });
    process.exit(0);
  };
  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));
}

main().catch((error) => {
  log(`fatal: ${(error as Error).message}`);
  process.exit(1);
});
