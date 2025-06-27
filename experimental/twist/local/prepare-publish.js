#!/usr/bin/env node
import { cp, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function prepare() {
  console.log('Preparing for publish...');

  // First, ensure TypeScript is available
  console.log('Installing TypeScript for build...');
  try {
    execSync('npm install --no-save typescript @types/node', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to install TypeScript:', e.message);
    process.exit(1);
  }

  // Build the local package first
  console.log('Building local package...');
  try {
    execSync('npx tsc && npx tsc -p tsconfig.integration.json', { stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to build local package:', e.message);
    process.exit(1);
  }

  // Then, ensure shared directory is built
  const sharedDir = join(__dirname, '../shared');
  console.log('Building shared directory...');
  try {
    execSync('npm install && npm run build', { cwd: sharedDir, stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to build shared directory:', e.message);
    process.exit(1);
  }

  // Clean up any existing shared directory
  try {
    await rm(join(__dirname, 'shared'), { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }

  // Copy the built shared files
  await cp(join(__dirname, '../shared/dist'), join(__dirname, 'shared'), { recursive: true });

  console.log('Copied shared files to local package');
}

prepare().catch(console.error);
