#!/usr/bin/env node

/**
 * Setup script for manual tests
 * Ensures all dependencies are installed and project is built
 */

import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

console.log('Setting up manual tests...\n');

// Step 1: Install dependencies
console.log('Step 1: Installing dependencies...');
const installProcess = spawn('npm', ['run', 'ci:install'], {
  stdio: 'inherit',
  shell: true,
  cwd: rootDir,
});

installProcess.on('close', (code) => {
  if (code !== 0) {
    console.error('Failed to install dependencies');
    process.exit(1);
  }

  console.log('Dependencies installed\n');

  // Step 2: Build the project
  console.log('Step 2: Building project...');
  const buildProcess = spawn('npm', ['run', 'build:test'], {
    stdio: 'inherit',
    shell: true,
    cwd: rootDir,
  });

  buildProcess.on('close', (buildCode) => {
    if (buildCode !== 0) {
      console.error('Failed to build project');
      process.exit(1);
    }

    console.log('\nManual test setup complete!');
    console.log('\nTo run manual tests:');
    console.log('  1. Create a .env file with your Fetch Pet credentials:');
    console.log('     FETCHPET_USERNAME=your-email@example.com');
    console.log('     FETCHPET_PASSWORD=your-password');
    console.log('  2. Run: npm run test:manual');
  });
});
