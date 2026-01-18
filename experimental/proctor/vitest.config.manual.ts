import { defineConfig } from 'vitest/config';
import dotenv from 'dotenv';

// Load .env file from current directory
dotenv.config();

export default defineConfig({
  test: {
    include: ['tests/manual/**/*.manual.test.ts'],
    environment: 'node',
    globals: false,
    testTimeout: 60000,
  },
});
