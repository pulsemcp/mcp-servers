#!/usr/bin/env node

import { existsSync, symlinkSync, unlinkSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const localPath = __dirname;
const sharedPath = join(localPath, '..', 'shared', 'build');
const symlinkPath = join(localPath, 'shared');

// Remove existing symlink if it exists
if (existsSync(symlinkPath)) {
  try {
    unlinkSync(symlinkPath);
  } catch (error) {
    console.error('Warning: Could not remove existing symlink:', error.message);
  }
}

// Create new symlink
try {
  symlinkSync(sharedPath, symlinkPath, 'dir');
  console.log('Created symlink for development');
} catch (error) {
  console.error('Error creating symlink:', error.message);
  process.exit(1);
}