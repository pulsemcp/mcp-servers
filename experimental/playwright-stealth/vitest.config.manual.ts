import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['**/manual/**/*.test.ts'],
    testTimeout: 120000, // Increased for proxy tests
  },
});
