import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema/index.ts',
  out: './drizzle',
  dialect: 'postgresql',
  casing: 'snake_case',
  dbCredentials: {
    // Migrations (DDL) run against the DIRECT endpoint, never the pgbouncer pooler.
    url:
      process.env.DATABASE_URL_UNPOOLED ||
      process.env.DATABASE_URL ||
      'postgres://pastra:pastra@localhost:5432/pastra',
  },
});
