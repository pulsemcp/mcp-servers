import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/manual/**/*.test.ts'],
    testTimeout: 60000,
  },
});
