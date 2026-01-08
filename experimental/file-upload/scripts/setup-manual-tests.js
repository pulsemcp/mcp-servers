#!/usr/bin/env node
/**
 * Setup script for manual tests
 * Run this before running manual tests for the first time
 */

import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Setting up manual tests for File Upload MCP Server...\n');

// Install dependencies
console.log('Installing dependencies...');
try {
  execSync('npm run ci:install', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build the project
console.log('\nBuilding project...');
try {
  execSync('npm run build:test', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Failed to build project:', error.message);
  process.exit(1);
}

console.log('\nManual test setup complete!');
console.log('You can now run: npm run test:manual');
console.log('\nNote: Manual tests require GCS credentials:');
console.log('  - GCS_BUCKET: Your GCS bucket name');
console.log('  - GOOGLE_APPLICATION_CREDENTIALS: Path to service account key (optional if using ADC)');
