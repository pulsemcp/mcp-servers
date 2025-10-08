#!/usr/bin/env node

/**
 * Sets up development environment by creating symlink to shared module
 */

import { symlinkSync, existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localDir = __dirname;
const sharedBuildDir = join(localDir, '..', 'shared', 'build');
const symlinkPath = join(localDir, 'shared');

// Remove existing symlink if it exists
if (existsSync(symlinkPath)) {
  try {
    unlinkSync(symlinkPath);
  } catch (error) {
    console.log('Could not remove existing symlink:', error.message);
  }
}

// Create symlink to shared/build
try {
  symlinkSync(sharedBuildDir, symlinkPath, 'dir');
  console.log('✅ Created symlink: shared -> ../shared/build');
} catch (error) {
  console.error('Failed to create symlink:', error.message);
  process.exit(1);
}