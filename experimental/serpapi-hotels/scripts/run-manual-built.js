#!/usr/bin/env node

/**
 * Run manual tests against built code
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

const additionalArgs = process.argv.slice(2);

// Build the project first
console.log('Building project for manual testing...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('Build failed');
    process.exit(1);
  }

  console.log('Build complete');
  console.log('\nRunning manual tests against BUILT code...\n');

  const testProcess = spawn(
    'node',
    ['scripts/run-vitest.js', 'run', '-c', 'vitest.config.manual.ts', ...additionalArgs],
    {
      stdio: 'inherit',
      shell: true,
      cwd: rootDir,
      env: {
        ...process.env,
        SERPAPI_HOTELS_TEST_MODE: 'built',
      },
    }
  );

  testProcess.on('close', (testCode) => {
    process.exit(testCode || 0);
  });
});
