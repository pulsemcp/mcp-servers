#!/usr/bin/env node
import { cp, rm, mkdir } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');
const publishedBuildDir = join(projectRoot, 'published-build');

async function buildPublished() {
  console.log('Building published package simulation...');

  try {
    // Clean up any existing published build
    await rm(publishedBuildDir, { recursive: true, force: true });
    await mkdir(publishedBuildDir, { recursive: true });

    // Copy the local directory to published-build
    await cp(join(projectRoot, 'local'), publishedBuildDir, { recursive: true });

    console.log('Copied local package to published-build directory');

    // Navigate to published-build and simulate the npm publish build process
    process.chdir(publishedBuildDir);

    console.log('Installing dependencies in published package...');
    execSync('npm install', { stdio: 'inherit' });

    console.log('Running prepublishOnly script (simulates publish build)...');
    execSync('npm run prepublishOnly', { stdio: 'inherit' });

    // Create symlink for shared package to enable workspace imports in tests
    console.log('Creating workspace symlink for tests...');
    const nodeModulesDir = join(publishedBuildDir, 'node_modules');
    await mkdir(nodeModulesDir, { recursive: true });

    // Create symlink for NAME-mcp-server-shared (replace NAME with actual name)
    const sharedPackageLink = join(nodeModulesDir, 'NAME-mcp-server-shared');
    const sharedPackageTarget = join(publishedBuildDir, '../shared');

    try {
      await rm(sharedPackageLink, { recursive: true, force: true });
      execSync(`ln -s ${sharedPackageTarget} ${sharedPackageLink}`);
      console.log('Created symlink for NAME-mcp-server-shared');
    } catch (error) {
      console.warn('Failed to create symlink:', error.message);
    }

    console.log('Published package simulation complete');
    console.log(`Published build available at: ${publishedBuildDir}`);
  } catch (error) {
    console.error('Error building published package:', error.message);
    process.exit(1);
  }
}

buildPublished().catch(console.error);
