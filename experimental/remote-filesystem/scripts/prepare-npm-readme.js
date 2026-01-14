#!/usr/bin/env node
/**
 * Prepares README for npm publishing
 * Copies the main README to local/ directory for npm package
 */

import { copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

const sourceReadme = join(rootDir, 'README.md');
const targetReadme = join(rootDir, 'local', 'README.md');

if (existsSync(sourceReadme)) {
  copyFileSync(sourceReadme, targetReadme);
  console.log('Copied README.md to local/ for npm publishing');
} else {
  console.warn('No README.md found in root directory');
}
