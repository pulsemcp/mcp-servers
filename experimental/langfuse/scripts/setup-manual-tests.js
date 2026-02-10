#!/usr/bin/env node

/**
 * Setup script to ensure the environment is ready for manual testing
 */

import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('🔧 Setting up manual test environment...\n');

const envPath = path.join(rootDir, '.env');
if (!existsSync(envPath)) {
  console.log('⚠️  No .env file found');
  console.log('   Create one with LANGFUSE_SECRET_KEY, LANGFUSE_PUBLIC_KEY, and LANGFUSE_BASE_URL\n');
} else {
  console.log('✅ .env file found\n');
}

console.log('📦 Installing all dependencies...');
try {
  execSync('npm run ci:install', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Dependencies installed\n');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

console.log('🔨 Building project and test dependencies...');
try {
  execSync('npm run build:test', { stdio: 'inherit', cwd: rootDir });
  console.log('✅ Build completed\n');
} catch (error) {
  console.error('❌ Build failed');
  process.exit(1);
}

const testClientPath = path.join(rootDir, '../../libs/test-mcp-client/build/index.js');
if (!existsSync(testClientPath)) {
  console.error('❌ test-mcp-client not built!');
  process.exit(1);
}

console.log('✅ Manual test environment is ready!');
console.log('\nYou can now run manual tests with:');
console.log('  npm run test:manual');
