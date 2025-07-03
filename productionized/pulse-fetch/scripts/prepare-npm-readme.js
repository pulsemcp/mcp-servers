#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths
const mainReadmePath = join(__dirname, '..', 'README.md');
const localReadmePath = join(__dirname, '..', 'local', 'README.md');
const outputPath = join(__dirname, '..', 'local', 'README.md');

try {
  // Read both README files
  let mainContent = readFileSync(mainReadmePath, 'utf-8');
  const localContent = readFileSync(localReadmePath, 'utf-8');

  // Add GitHub repo reference at the top
  const repoNotice = `> **Note**: This package is part of the [MCP Servers](https://github.com/pulsemcp/mcp-servers) monorepo. For the latest updates and full source code, visit the [Pulse Fetch MCP Server directory](https://github.com/pulsemcp/mcp-servers/tree/main/productionized/pulse-fetch).

`;

  // Insert repo notice after the title
  const titleMatch = mainContent.match(/^#.*Pulse Fetch MCP Server.*$/m);
  if (titleMatch) {
    const titleIndex = mainContent.indexOf(titleMatch[0]);
    const titleEndIndex = titleIndex + titleMatch[0].length;
    mainContent =
      mainContent.substring(0, titleEndIndex) +
      '\n\n' +
      repoNotice +
      mainContent.substring(titleEndIndex + 1);
  }

  // Extract the configuration section from local README
  const configMatch = localContent.match(/## Configuration[\s\S]*$/m);
  const localConfigSection = configMatch ? configMatch[0] : '';

  // Find where to insert the local configuration
  // Look for the Manual Setup section and insert the local config before it
  const manualSetupIndex = mainContent.indexOf('### Manual Setup');

  if (manualSetupIndex !== -1 && localConfigSection) {
    // Find the beginning of the Manual Setup section content
    const beforeManualSetup = mainContent.substring(0, manualSetupIndex);
    const afterManualSetup = mainContent.substring(manualSetupIndex);

    // Insert the local configuration section before Manual Setup
    mainContent = beforeManualSetup + localConfigSection + '\n\n' + afterManualSetup;
  }

  // Write the combined README to local directory
  writeFileSync(outputPath, mainContent);

  console.log('✅ Successfully prepared README for npm publication');
  console.log('   - Added GitHub repository reference');
  console.log('   - Merged configuration sections from local README');
} catch (error) {
  console.error('❌ Error preparing README:', error);
  process.exit(1);
}
