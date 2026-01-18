#!/usr/bin/env node
/**
 * Run manual tests against built code
 */
import { execSync } from 'child_process';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

// Check for .env file
const envPath = join(projectRoot, '.env');
if (!existsSync(envPath)) {
  console.error('Error: .env file not found');
  console.error(`Please create ${envPath} with your PROCTOR_API_KEY`);
  process.exit(1);
}

// Build first
console.log('Building project...');
try {
  execSync('npm run build', { cwd: projectRoot, stdio: 'inherit' });
} catch {
  console.error('Build failed');
  process.exit(1);
}

// Run manual tests
console.log('\nRunning manual tests...');
try {
  execSync('node scripts/run-vitest.js run -c vitest.config.manual.ts', {
    cwd: projectRoot,
    stdio: 'inherit',
    env: { ...process.env },
  });
} catch {
  console.error('Manual tests failed');
  process.exit(1);
}
