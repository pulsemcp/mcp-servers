#!/usr/bin/env node

/**
 * Setup script to ensure the environment is ready for manual testing
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('Setting up manual test environment...\n');

// Check for .env file
const envPath = path.join(rootDir, '.env');
if (!existsSync(envPath)) {
  console.error('Missing .env file!');
  console.log('   Please create .env and add your POINTSYEAH_REFRESH_TOKEN:');
  console.log('   echo "POINTSYEAH_REFRESH_TOKEN=your-token" > .env');
  process.exit(1);
}

// Check if refresh token is set
const envContent = readFileSync(envPath, 'utf8');
if (
  !envContent.includes('POINTSYEAH_REFRESH_TOKEN=') ||
  envContent.includes('POINTSYEAH_REFRESH_TOKEN=your-')
) {
  console.error('POINTSYEAH_REFRESH_TOKEN not configured in .env!');
  console.log('   Please edit .env and add your real refresh token');
  process.exit(1);
}

console.log('.env file configured\n');

// Install all dependencies
console.log('Installing all dependencies...');
try {
  execSync('npm run ci:install', { stdio: 'inherit', cwd: rootDir });
  console.log('Dependencies installed\n');
} catch {
  console.error('Failed to install dependencies');
  process.exit(1);
}

// Build everything needed for tests
console.log('Building project and test dependencies...');
try {
  execSync('npm run build:test', { stdio: 'inherit', cwd: rootDir });
  console.log('Build completed\n');
} catch {
  console.error('Build failed');
  process.exit(1);
}

// Verify test-mcp-client is built
const testClientPath = path.join(rootDir, '../../libs/test-mcp-client/build/index.js');
if (!existsSync(testClientPath)) {
  console.error('test-mcp-client not built!');
  console.log('   This should have been built by build:test');
  process.exit(1);
}

console.log('Manual test environment is ready!');
console.log('\nYou can now run manual tests with:');
console.log('  npm run test:manual');
