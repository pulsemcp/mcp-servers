#!/usr/bin/env node
/**
 * Prepares README for npm package publication
 * Concatenates main README sections for npm
 */
import { readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

try {
  const readme = readFileSync(join(projectRoot, 'README.md'), 'utf-8');
  writeFileSync(join(projectRoot, 'local', 'README.md'), readme);
  console.log('README.md copied to local directory for npm publishing');
} catch (error) {
  console.error('Failed to prepare README:', error.message);
  process.exit(1);
}
