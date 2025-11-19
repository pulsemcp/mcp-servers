#!/usr/bin/env node

/**
 * Setup script for development environment
 * Creates a symlink from local/shared -> ../shared/build for development
 */

import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const linkPath = path.join(__dirname, 'shared');
const targetPath = path.join(__dirname, '../shared/build');

try {
  // Remove existing symlink/directory if it exists
  if (fs.existsSync(linkPath)) {
    const stats = fs.lstatSync(linkPath);
    if (stats.isSymbolicLink()) {
      fs.unlinkSync(linkPath);
      console.log('✓ Removed existing symlink');
    }
  }

  // Create symlink
  fs.symlinkSync(targetPath, linkPath, 'dir');
  console.log('✓ Created development symlink: local/shared -> ../shared/build');
} catch (error) {
  console.error('Error setting up development environment:', error);
  process.exit(1);
}
