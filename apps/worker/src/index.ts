import { getConfig } from '@pastra/config';
import { catalog } from '@pastra/catalog';

/**
 * Background worker entry point (docs/architecture.md section 2). Long-running and scheduled work
 * (the weekly drop chain, per-service syncs) lands here from stage 5 onward. For now it validates
 * config and the catalog at boot so misconfiguration fails fast.
 */
function main(): void {
  const config = getConfig();
  console.log(
    `[worker] started · env=${config.NODE_ENV} · card=${config.CARD_PROVIDER} · providers=${catalog.providers.length}`,
  );

  const shutdown = (signal: string): void => {
    console.log(`[worker] ${signal} received, shutting down`);
    process.exit(0);
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main();
