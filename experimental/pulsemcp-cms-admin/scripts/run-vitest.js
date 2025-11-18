#!/usr/bin/env node

/**
 * Wrapper script to run vitest with proper ESM support
 */

import { run } from 'vitest/node';

// Pass through all command-line arguments
const args = process.argv.slice(2);

try {
  await run('test', args);
} catch (error) {
  console.error('Error running vitest:', error);
  process.exit(1);
}
