#!/usr/bin/env node
/**
 * Setup script for manual tests
 * Run this before running manual tests for the first time
 */

import { existsSync } from 'fs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

console.log('Setting up manual tests for Slack MCP Server...\n');

// Check for .env file
const envPath = join(rootDir, '.env');
if (!existsSync(envPath)) {
  console.error('ERROR: .env file not found!');
  console.error('Please create a .env file with your Slack API credentials:');
  console.error('  SLACK_BOT_TOKEN=xoxb-your-bot-token');
  console.error('\nYou can copy .env.example as a starting point.');
  process.exit(1);
}

console.log('Found .env file');

// Install dependencies
console.log('\nInstalling dependencies...');
try {
  execSync('npm run ci:install', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Failed to install dependencies:', error.message);
  process.exit(1);
}

// Build the project
console.log('\nBuilding project...');
try {
  execSync('npm run build:test', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
  console.error('Failed to build project:', error.message);
  process.exit(1);
}

console.log('\nManual test setup complete!');
console.log('You can now run: npm run test:manual');
