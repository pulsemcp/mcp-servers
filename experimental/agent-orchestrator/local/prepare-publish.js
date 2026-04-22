#!/usr/bin/env node
import { cp, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { createRequire } from 'module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

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

  // Resolve the tsc entry point via require.resolve. npm workspace hoisting
  // puts typescript in the workspace root's node_modules (not shared/local's),
  // so a hardcoded path is fragile. Previous attempts:
  //   - bare `tsc` via `npm run build`: fails (binary not in shared/.bin)
  //   - `npx tsc`: resolves to the unrelated `tsc@2.0.4` npm package
  //   - `npx --package typescript tsc`: re-fetches typescript@latest every run
  //     and hits npx cache ENOENTs on the distribute CI runner (#2791 fallout)
  // require.resolve walks up from this file and finds the hoisted typescript.
  const tscPath = require.resolve('typescript/bin/tsc');

  // Build shared directory first
  const sharedDir = join(__dirname, '../shared');
  console.log('Building shared directory...');
  try {
    execSync('npm install', { cwd: sharedDir, stdio: 'inherit' });
    execSync(`node "${tscPath}"`, { cwd: sharedDir, stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to build shared directory:', e.message);
    process.exit(1);
  }

  // Set up the shared directory for the build
  console.log('Setting up shared directory for build...');
  try {
    // Create a symlink for the build process (like setup-dev.js does)
    await rm(join(__dirname, 'shared'), { recursive: true, force: true });
    execSync(`node setup-dev.js`, { cwd: __dirname, stdio: 'inherit' });
  } catch (e) {
    console.error('Failed to set up shared directory:', e.message);
    process.exit(1);
  }

  // Now build the local package
  console.log('Building local package...');
  try {
    execSync(`node "${tscPath}" && node "${tscPath}" -p tsconfig.integration.json`, {
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('Failed to build local package:', e.message);
    process.exit(1);
  }

  // Clean up the symlink and copy the actual files for publishing
  try {
    await rm(join(__dirname, 'shared'), { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }

  // Copy the built shared files
  await cp(join(__dirname, '../shared/build'), join(__dirname, 'shared'), { recursive: true });

  console.log('Copied shared files to local package');
}

prepare().catch(console.error);
