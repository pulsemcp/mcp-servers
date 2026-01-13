#!/usr/bin/env node

/**
 * Prepares the README for npm publishing by combining sections
 */

import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.join(__dirname, '..');
const localDir = path.join(rootDir, 'local');

// Read the main README
const mainReadme = readFileSync(path.join(rootDir, 'README.md'), 'utf-8');

// Write to local directory for npm publishing
writeFileSync(path.join(localDir, 'README.md'), mainReadme);

console.log('README prepared for npm publishing');
