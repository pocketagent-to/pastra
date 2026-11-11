import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** The Drizzle database handle used across the app (postgres-js driver at runtime). */
export type Database = PostgresJsDatabase<typeof schema>;

/**
 * Where this handle runs, which decides the pool shape:
 * - `serverless`: Vercel functions on the Neon POOLER (pgbouncer transaction mode). Each warm
 *   instance keeps ONE connection (the pooler multiplexes), prepared statements are OFF (txn
 *   pooling cannot keep named statements), and idle connections are released quickly so warm-but-
 *   quiet lambdas do not pin the pool.
 * - `persistent`: the long-lived worker, migrations and seed on the DIRECT endpoint (pg-boss needs
 *   LISTEN/NOTIFY and advisory locks; DDL needs a session). A real pool, prepared statements on.
 */
export type DbRole = 'serverless' | 'persistent';

/** Create a database handle from a connection string. See {@link DbRole} for the pool shape. */
export function createDb(connectionString: string, role: DbRole = 'persistent'): Database {
  const serverless = role === 'serverless';
  const client = postgres(connectionString, {
    max: serverless ? 1 : 10,
    prepare: !serverless,
    idle_timeout: serverless ? 20 : undefined,
    connect_timeout: 10,
    max_lifetime: serverless ? 60 * 5 : undefined,
  });
  return drizzle(client, { schema });
}

/** Liveness check: run `select 1`. Throws if the database is unreachable. */
export async function ping(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}
