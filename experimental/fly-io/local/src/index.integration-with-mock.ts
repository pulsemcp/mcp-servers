#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked FlyIOClient.
 * It uses the real MCP server but injects a mock client factory.
 *
 * Mock data is passed via the FLY_IO_MOCK_DATA environment variable.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// Import from shared module via symlink (created by setup-dev.js)
import { createMCPServer } from '../shared/index.js';
// Import the mock client factory from the shared module
import { createIntegrationMockFlyIOClient } from '../shared/fly-io-client/fly-io-client.integration-mock.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData = {};
  if (process.env.FLY_IO_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.FLY_IO_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse FLY_IO_MOCK_DATA:', e);
    }
  }

  // Create client factory that returns our mock
  const clientFactory = () => createIntegrationMockFlyIOClient(mockData);

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
