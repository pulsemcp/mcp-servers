import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/manual/**/*.test.ts'],
    testTimeout: 60000, // Manual tests may take longer due to real API calls
    hookTimeout: 120000, // Longer timeout for beforeAll that creates tables
    setupFiles: ['dotenv/config'], // Load .env file for API keys
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
