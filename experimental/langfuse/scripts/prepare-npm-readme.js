#!/usr/bin/env node

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const mainReadmePath = join(__dirname, '..', 'README.md');
const outputPath = join(__dirname, '..', 'local', 'README.md');

try {
  let mainContent = readFileSync(mainReadmePath, 'utf-8');

  const repoNotice = `> **Note**: This package is part of the [MCP Servers](https://github.com/pulsemcp/mcp-servers) monorepo. For the latest updates and full source code, visit the [Langfuse MCP Server directory](https://github.com/pulsemcp/mcp-servers/tree/main/experimental/langfuse).

`;

  const titleMatch = mainContent.match(/^#.*Langfuse MCP Server.*$/m);
  if (titleMatch) {
    const titleIndex = mainContent.indexOf(titleMatch[0]);
    const titleEndIndex = titleIndex + titleMatch[0].length;
    mainContent =
      mainContent.substring(0, titleEndIndex) +
      '\n\n' +
      repoNotice +
      mainContent.substring(titleEndIndex + 1);
  }

  writeFileSync(outputPath, mainContent);
  console.log('✅ Successfully prepared README for npm publication');
} catch (error) {
  console.error('❌ Error preparing README:', error);
  process.exit(1);
}
