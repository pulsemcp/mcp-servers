#!/usr/bin/env node
import { cp, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function prepare() {
  console.log('Preparing for publish...');

  const sharedDir = join(__dirname, '../shared');
  console.log('Building shared directory...');
  try {
    execSync('npm install && npm run build', { cwd: sharedDir, stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to build shared directory:', e.message);
    process.exit(1);
  }

  console.log('Setting up shared directory for build...');
  try {
    await rm(join(__dirname, 'shared'), { recursive: true, force: true });
    execSync(`node setup-dev.js`, { cwd: __dirname, stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to set up shared directory:', e.message);
    process.exit(1);
  }

  console.log('Building local package...');
  try {
    execSync('npx tsc && npx tsc -p tsconfig.integration.json', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to build local package:', e.message);
    process.exit(1);
  }

  try {
    await rm(join(__dirname, 'shared'), { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }

  await cp(join(__dirname, '../shared/build'), join(__dirname, 'shared'), { recursive: true });
  console.log('Copied shared files to local package');
}

prepare().catch(console.error);
