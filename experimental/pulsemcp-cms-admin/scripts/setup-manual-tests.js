#!/usr/bin/env node

/**
 * Setup script to ensure the environment is ready for manual testing
 * This handles all the prerequisites that manual tests need
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔧 Setting up manual test environment...\n');

// Check for .env file
const envPath = path.join(rootDir, '.env');
if (!existsSync(envPath)) {
  console.error('❌ Missing .env file!');
  console.log('   Please create .env from .env.example and add your API key:');
  console.log('   cp .env.example .env');
  console.log('   Then edit .env and add your PULSEMCP_ADMIN_API_KEY');
  process.exit(1);
}

// Check if API key is set
const envContent = readFileSync(envPath, 'utf8');
if (
  !envContent.includes('PULSEMCP_ADMIN_API_KEY=') ||
  envContent.includes('PULSEMCP_ADMIN_API_KEY=your-')
) {
  console.error('❌ PULSEMCP_ADMIN_API_KEY not configured in .env!');
  console.log('   Please edit .env and add your real API key');
  process.exit(1);
}

// Check if staging URL is set (manual tests MUST run against staging, not production)
if (!envContent.includes('PULSEMCP_ADMIN_API_URL=')) {
  console.error('❌ PULSEMCP_ADMIN_API_URL not configured in .env!');
  console.log('   Manual tests MUST run against staging, not production.');
  console.log('   Add this to your .env file:');
  console.log('   PULSEMCP_ADMIN_API_URL=https://admin.staging.pulsemcp.com');
  process.exit(1);
} else if (!envContent.includes('staging.pulsemcp.com')) {
  console.warn('⚠️  PULSEMCP_ADMIN_API_URL does not point to staging!');
  console.log('   Manual tests should run against: https://admin.staging.pulsemcp.com');
  console.log('   Current value may be pointing to production.\n');
}

console.log('✅ .env file configured (staging)\n');

// Install all dependencies
console.log('📦 Installing all dependencies...');
try {
  execSync('npm run ci:install', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

// Build everything needed for tests
console.log('🔨 Building project and test dependencies...');
try {
  execSync('npm run build:test', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Build completed\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

// Verify test-mcp-client is built
const testClientPath = path.join(rootDir, '../../libs/test-mcp-client/build/index.js');
if (!existsSync(testClientPath)) {
  console.error('❌ test-mcp-client not built!');
  console.log('   This should have been built by build:test');
  process.exit(1);
}

console.log('✅ Manual test environment is ready!');
console.log('\nYou can now run manual tests with:');
console.log('  npm run test:manual');
console.log('\nTo run a specific test file:');
console.log('  npm run test:manual -- tests/manual/your-test.manual.test.ts');
