#!/usr/bin/env node
/**
 * Prepare README for npm publishing
 * Copies the main README to the local directory for npm packaging
 */

import { copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const srcPath = join(__dirname, '../README.md');
const destPath = join(__dirname, '../local/README.md');

try {
  copyFileSync(srcPath, destPath);
  console.log('Copied README.md to local directory');
} catch (error) {
  console.error('Failed to copy README.md:', error.message);
  process.exit(1);
}
