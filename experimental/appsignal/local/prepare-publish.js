#!/usr/bin/env node
import { cp, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function prepare() {
  console.log('Preparing for publish...');
  
  // Clean up any existing shared directory
  try {
    await rm(join(__dirname, 'shared'), { recursive: true, force: true });
  } catch (e) {
    // Ignore if doesn't exist
  }
  
  // Copy the built shared files
  await cp(
    join(__dirname, '../shared/dist'), 
    join(__dirname, 'shared'),
    { recursive: true }
  );
  
  console.log('Copied shared files to local package');
}

prepare().catch(console.error);