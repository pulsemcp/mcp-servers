import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/functional/**/*.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 10000,
  },
});
