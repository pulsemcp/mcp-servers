#!/usr/bin/env node
import { cp, mkdir, rm } from 'fs/promises';
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

  // Build the elicitation library first (shared depends on it via file: link)
  const elicitationDir = join(__dirname, '../../../libs/elicitation');
  console.log('Building elicitation library...');
  try {
    execSync('npm install --ignore-scripts && npm run build', {
      cwd: elicitationDir,
      stdio: 'inherit',
    });
  } catch (e) {
    console.error('Failed to build elicitation library:', e.message);
    process.exit(1);
  }

  // Build shared directory
  const sharedDir = join(__dirname, '../shared');
  console.log('Building shared directory...');
  try {
    execSync('npm install && npm run build', { cwd: sharedDir, stdio: 'inherit' });
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
    execSync('npx tsc && npx tsc -p tsconfig.integration.json', { stdio: 'inherit' });
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

  // Copy the built elicitation library into node_modules so bundledDependencies can find it.
  // The file: link in package.json points to the monorepo source, which doesn't exist when
  // the package is installed via npx. bundledDependencies requires the package to physically
  // exist in node_modules/ at publish time so npm can include it in the tarball.
  const elicitationNodeModulesDir = join(
    __dirname,
    'node_modules/@pulsemcp/mcp-elicitation'
  );
  console.log('Copying elicitation library into node_modules for bundling...');
  await rm(elicitationNodeModulesDir, { recursive: true, force: true });
  await mkdir(elicitationNodeModulesDir, { recursive: true });
  await cp(join(elicitationDir, 'build'), join(elicitationNodeModulesDir, 'build'), {
    recursive: true,
  });
  await cp(
    join(elicitationDir, 'package.json'),
    join(elicitationNodeModulesDir, 'package.json')
  );

  console.log('Elicitation library bundled for publishing');
}

prepare().catch(console.error);
