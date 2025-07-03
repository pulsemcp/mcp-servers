import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/manual/features/**/*.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
