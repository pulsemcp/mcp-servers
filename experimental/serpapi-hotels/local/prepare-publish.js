#!/usr/bin/env node
import { execSync } from 'child_process';
import { cpSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

async function preparePublish() {
  console.log('Preparing package for publication...\n');

  // Step 1: Install TypeScript in shared
  console.log('1. Installing shared dependencies...');
  execSync('npm install', { cwd: join(rootDir, 'shared'), stdio: 'inherit' });

  // Step 2: Build shared
  console.log('\n2. Building shared module...');
  execSync('npm run build', { cwd: join(rootDir, 'shared'), stdio: 'inherit' });

  // Step 3: Setup symlinks for local build
  console.log('\n3. Setting up symlinks...');
  execSync('node setup-dev.js', { cwd: __dirname, stdio: 'inherit' });

  // Step 4: Build local
  console.log('\n4. Building local module...');
  execSync('npx tsc', { cwd: __dirname, stdio: 'inherit' });

  // Step 5: Remove symlink and copy built shared files
  console.log('\n5. Preparing shared files for package...');
  const sharedLink = join(__dirname, 'shared');

  if (existsSync(sharedLink)) {
    rmSync(sharedLink, { recursive: true, force: true });
  }

  cpSync(join(rootDir, 'shared', 'build'), sharedLink, { recursive: true });

  console.log('\nPackage prepared successfully!');
}

preparePublish().catch((error) => {
  console.error('Prepare publish failed:', error);
  process.exit(1);
});
