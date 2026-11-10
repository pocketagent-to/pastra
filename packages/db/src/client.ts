import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/** The Drizzle database handle used across the app (postgres-js driver at runtime). */
export type Database = PostgresJsDatabase<typeof schema>;

/** Create a database handle from a connection string. */
export function createDb(connectionString: string): Database {
  const client = postgres(connectionString, { max: 10 });
  return drizzle(client, { schema });
}

/** Liveness check: run `select 1`. Throws if the database is unreachable. */
export async function ping(db: Database): Promise<void> {
  await db.execute(sql`select 1`);
}
