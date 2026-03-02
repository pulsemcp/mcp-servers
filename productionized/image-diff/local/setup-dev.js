#!/usr/bin/env node
import { symlink, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function setupDev() {
  const linkPath = join(__dirname, 'shared');
  const targetPath = join(__dirname, '../shared/build');

  try {
    await unlink(linkPath);
  } catch (e) {
    // Ignore if doesn't exist
  }

  try {
    await symlink(targetPath, linkPath, 'dir');
    console.log('Created symlink for development');
  } catch (e) {
    console.error('Failed to create symlink:', e.message);
  }
}

setupDev().catch(console.error);
