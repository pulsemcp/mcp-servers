#!/usr/bin/env node

/**
 * Run manual tests against built code
 * This ensures we're testing the actual compiled JavaScript, not just TypeScript source
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function runManualTests() {
  try {
    console.log('Building project...');
    await execAsync('npm run build');
    console.log('Build complete\n');

    console.log('Running manual tests...');
    // Use a custom config that includes manual tests
    const { stdout, stderr } = await execAsync(
      'npx vitest run --config vitest.config.manual.ts tests/manual/'
    );

    if (stdout) console.log(stdout);
    if (stderr) console.error(stderr);

    console.log('Manual tests complete');
  } catch (error) {
    console.error('Manual tests failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

runManualTests();
