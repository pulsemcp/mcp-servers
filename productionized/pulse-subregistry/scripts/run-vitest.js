#!/usr/bin/env node
/**
 * Wrapper script to run vitest with proper ES module support
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Import and run vitest CLI
const vitestCliPath = join(__dirname, '../node_modules/vitest/dist/cli.js');
await import(vitestCliPath);
