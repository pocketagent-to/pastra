import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Resolve the `@pastra/*` workspace aliases from the root tsconfig paths.
    tsconfigPaths: true,
  },
  test: {
    include: ['packages/*/test/**/*.test.ts', 'packages/*/src/**/*.test.ts'],
    environment: 'node',
    globals: false,
  },
});
