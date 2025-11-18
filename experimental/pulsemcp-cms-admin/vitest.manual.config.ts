import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    // Include manual tests, exclude others
    include: ['**/manual/**/*.test.ts'],
    exclude: ['**/node_modules/**', '**/build/**'],
    testTimeout: 30000, // Longer timeout for real API calls
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
