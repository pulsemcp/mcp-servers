import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/manual/**/*.test.ts'],
    testTimeout: 60000,
    hookTimeout: 30000,
  },
});
