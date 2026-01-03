#!/usr/bin/env node
/**
 * Prepares the local package for npm publishing
 * - Builds the shared module
 * - Copies built files (instead of symlinks)
 */

import { cp, rm, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function preparePublish() {
  console.log('Preparing for npm publish...');

  // Build shared first
  console.log('Building shared module...');
  execSync('npm install && npm run build', {
    cwd: join(__dirname, '../shared'),
    stdio: 'inherit',
  });

  // Build local using symlink (like dev)
  console.log('Setting up development symlink...');
  execSync('node setup-dev.js', { cwd: __dirname, stdio: 'inherit' });

  console.log('Building local module...');
  execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });

  // Remove symlink and copy actual files
  const sharedPath = join(__dirname, 'shared');

  if (existsSync(sharedPath)) {
    await rm(sharedPath, { recursive: true, force: true });
  }

  await mkdir(sharedPath, { recursive: true });

  console.log('Copying shared build files...');
  await cp(join(__dirname, '../shared/build'), sharedPath, { recursive: true });

  console.log('Ready for npm publish!');
}

preparePublish().catch((error) => {
  console.error('Prepare publish failed:', error);
  process.exit(1);
});
