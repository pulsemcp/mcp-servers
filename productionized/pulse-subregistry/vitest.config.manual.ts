import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/manual/**/*.manual.test.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
