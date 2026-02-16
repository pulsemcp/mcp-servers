#!/usr/bin/env node
/**
 * Integration test entry point that uses a mock client.
 * This allows testing MCP server functionality without actual SerpAPI calls.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from '../shared/tools.js';
import { registerResources } from '../shared/resources.js';
import { logServerStart, logError } from '../shared/logging.js';
import { createIntegrationMockSerpApiClient } from '../shared/serpapi-client/serpapi-client.integration-mock.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const server = new Server(
    {
      name: 'serpapi-hotels-mcp-server',
      version: VERSION,
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  // Create mock client
  const mockClient = createIntegrationMockSerpApiClient();

  // Register handlers with mock client factory
  registerResources(server);
  const registerTools = createRegisterTools(() => mockClient);
  registerTools(server);

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('serpapi-hotels-mcp-server (Mock Mode)');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
