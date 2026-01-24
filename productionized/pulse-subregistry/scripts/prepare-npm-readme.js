#!/usr/bin/env node
/**
 * Prepares the README for npm publication by combining main README with local configuration.
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mainReadmePath = join(__dirname, '../README.md');
const localReadmePath = join(__dirname, '../local/README.md');
const outputPath = join(__dirname, '../local/README.md');

try {
  const mainReadme = readFileSync(mainReadmePath, 'utf8');
  const localReadme = readFileSync(localReadmePath, 'utf8');

  // Combine READMEs - main content first, then local-specific content
  const combinedReadme = `${mainReadme}\n\n---\n\n${localReadme}`;

  writeFileSync(outputPath, combinedReadme, 'utf8');
  console.log('Successfully prepared README for npm publication');
} catch (error) {
  console.error('Error preparing README:', error.message);
  process.exit(1);
}
