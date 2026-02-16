import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/manual/**/*.test.ts'],
    testTimeout: 120000, // Manual tests hit real Google Flights (large HTML responses)
    setupFiles: ['dotenv/config'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './shared/src'),
    },
  },
  esbuild: {
    target: 'node18',
  },
});
