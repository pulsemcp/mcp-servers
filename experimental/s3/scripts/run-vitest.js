#!/usr/bin/env node
/**
 * Wrapper script to run vitest with proper ES module support.
 * Handles npm workspace hoisting by checking multiple node_modules locations.
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Possible vitest locations (in order of preference):
// 1. Local node_modules (experimental/s3/node_modules)
// 2. Monorepo root node_modules (../../node_modules from experimental/s3)
const vitestPaths = [
  join(__dirname, '../node_modules/vitest/dist/cli.js'),
  join(__dirname, '../../../node_modules/vitest/dist/cli.js'),
];

let imported = false;
for (const vitestPath of vitestPaths) {
  if (existsSync(vitestPath)) {
    await import(vitestPath);
    imported = true;
    break;
  }
}

if (!imported) {
  console.error('Error: Could not find vitest in any node_modules location.');
  console.error('Searched paths:', vitestPaths);
  process.exit(1);
}
