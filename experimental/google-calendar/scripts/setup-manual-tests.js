#!/usr/bin/env node
/**
 * Setup script for manual tests
 * Ensures all dependencies are installed and project is built
 */

import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

console.log('Setting up manual tests...');

try {
  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm run install-all', { cwd: rootDir, stdio: 'inherit' });

  // Build the project
  console.log('Building project...');
  execSync('npm run build', { cwd: rootDir, stdio: 'inherit' });

  // Build test-mcp-client
  console.log('Building test-mcp-client...');
  execSync('npm run build', {
    cwd: join(rootDir, '../../libs/test-mcp-client'),
    stdio: 'inherit',
  });

  console.log('Manual test setup complete!');
} catch (error) {
  console.error('Setup failed:', error.message);
  process.exit(1);
}
