#!/usr/bin/env node

/**
 * Run manual tests against built code
 *
 * This script ensures manual tests run against the built version of the code,
 * similar to how integration tests have built vs source versions.
 */

import 'dotenv/config';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

// Get test type from command line
const testType = process.argv[2];
const additionalArgs = process.argv.slice(3);

if (!testType || !['pages', 'features'].includes(testType)) {
  console.error('Usage: node scripts/run-manual-built.js <pages|features> [additional args]');
  process.exit(1);
}

// Build the project first
console.log('🔨 Building project for manual testing...');
const buildProcess = spawn('npm', ['run', 'build'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

buildProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('❌ Build failed');
    process.exit(1);
  }

  console.log('✅ Build complete');
  console.log(`\n🧪 Running manual ${testType} tests against BUILT code...\n`);

  let testCommand;
  let testArgs;

  if (testType === 'pages') {
    // For pages test, run the TypeScript file directly
    testCommand = 'node';
    testArgs = ['--import', 'tsx', 'tests/manual/pages/pages.manual.test.ts', ...additionalArgs];
  } else {
    // For features test, use vitest with the manual config
    testCommand = 'node';
    testArgs = ['scripts/run-vitest.js', 'run', '-c', 'vitest.config.manual.ts', ...additionalArgs];
  }

  // Run the test
  const testProcess = spawn(testCommand, testArgs, {
    stdio: 'inherit',
    shell: true,
    cwd: rootDir,
    env: {
      ...process.env,
      // Ensure we're testing the built code
      PULSE_FETCH_TEST_MODE: 'built',
    },
  });

  testProcess.on('close', (testCode) => {
    process.exit(testCode || 0);
  });
});
