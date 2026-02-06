#!/usr/bin/env node
/**
 * Wrapper script to run vitest with proper ES module support.
 * Handles both local node_modules and npm workspace hoisting scenarios.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Try local node_modules first, then fall back to npm workspace resolution
const localVitestPath = join(__dirname, '../node_modules/vitest/dist/cli.js');

if (existsSync(localVitestPath)) {
  await import(localVitestPath);
} else {
  // Fall back to letting Node resolve vitest from hoisted location
  await import('vitest/dist/cli.js');
}
