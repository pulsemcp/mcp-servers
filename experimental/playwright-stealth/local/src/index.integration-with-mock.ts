#!/usr/bin/env node
/**
 * Integration test entry point with mock client
 * Used for testing the MCP server without launching a real browser
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';
import { createMockPlaywrightClient } from '../shared/playwright-client/playwright-client.integration-mock.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Use mock client factory for integration tests
  await registerHandlers(server, createMockPlaywrightClient);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Playwright (Integration Mock)');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
