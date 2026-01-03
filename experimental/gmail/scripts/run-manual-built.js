#!/usr/bin/env node
/**
 * Runs manual tests against built code
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

try {
  // Build first
  console.log('Building project...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // Run manual tests
  console.log('Running manual tests...');
  execSync('node scripts/run-vitest.js run -c vitest.config.manual.ts', {
    cwd: rootDir,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch (error) {
  console.error('Manual tests failed:', error.message);
  process.exit(1);
}
