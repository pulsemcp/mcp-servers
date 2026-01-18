#!/usr/bin/env node
/**
 * Setup script for manual tests
 * Ensures all dependencies and builds are in place
 */
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

console.log('Setting up manual tests...');

try {
  // Install dependencies
  console.log('Installing dependencies...');
  execSync('npm run ci:install', { cwd: projectRoot, stdio: 'inherit' });

  // Build the project
  console.log('Building project...');
  execSync('npm run build:test', { cwd: projectRoot, stdio: 'inherit' });

  console.log('\nManual test setup complete!');
  console.log('Make sure you have a .env file with PROCTOR_API_KEY set.');
  console.log('Run manual tests with: npm run test:manual');
} catch (error) {
  console.error('Setup failed:', error.message);
  process.exit(1);
}
