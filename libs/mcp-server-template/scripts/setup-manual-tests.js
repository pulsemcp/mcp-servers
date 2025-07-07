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
  console.log('ℹ️  No .env file found');
  console.log('   This is OK for the template - it doesn\'t require API keys');
  console.log('   When implementing your server, create .env from .env.example if needed\n');
} else {
  console.log('✅ .env file found\n');
}

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
console.log('\nNote: The template includes example manual tests.');
console.log('      Update them when implementing your server.');