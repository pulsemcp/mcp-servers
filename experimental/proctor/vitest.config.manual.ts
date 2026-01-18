import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/manual/**/*.manual.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 60000,
  },
});
