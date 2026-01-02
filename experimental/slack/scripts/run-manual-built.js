#!/usr/bin/env node
/**
 * Runs manual tests against built JavaScript code
 * This ensures we're testing what will actually be published
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Building project before running manual tests...\n');

// Build the project first
try {
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}

console.log('\nRunning manual tests...\n');

// Run manual tests
try {
  execSync('node scripts/run-vitest.js run -c vitest.config.manual.ts', {
    cwd: rootDir,
    stdio: 'inherit',
    env: {
      ...process.env,
      // Load environment variables from .env
    },
  });
} catch (error) {
  console.error('Manual tests failed:', error.message);
  process.exit(1);
}
