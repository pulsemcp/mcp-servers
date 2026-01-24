#!/usr/bin/env node

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// Validate environment variables
function validateEnvironment() {
  const apiKey = process.env.PULSEMCP_API_KEY;

  if (!apiKey) {
    console.error('Missing required environment variable: PULSEMCP_API_KEY');
    console.error('Get your API key from https://www.pulsemcp.com/');
    process.exit(1);
  }

  console.error(`Pulse Sub-Registry MCP server starting (v${VERSION})`);

  if (process.env.PULSEMCP_TENANT_ID) {
    console.error('Using tenant ID:', process.env.PULSEMCP_TENANT_ID);
  }
}

async function main() {
  validateEnvironment();

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
