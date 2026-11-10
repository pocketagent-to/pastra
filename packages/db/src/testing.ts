import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import * as schema from './schema';
import type { Database } from './client';

/**
 * An in-process Postgres (PGlite) with the full schema applied from the generated migrations.
 * Used by integration tests so they run without a database server. The returned handle is
 * API-compatible with the postgres-js {@link Database} used at runtime.
 */
export async function createTestDb(): Promise<{ db: Database; close: () => Promise<void> }> {
  const client = new PGlite();
  const db = drizzle(client, { schema });
  const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url));
  await migrate(db, { migrationsFolder });
  return {
    db: db as unknown as Database,
    close: async () => {
      await client.close();
    },
  };
}
