#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked TwistClient.
 * It uses the real MCP server but injects a mock client factory.
 *
 * Mock data is passed via the EXAMPLE_MOCK_DATA environment variable.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'twist-mcp-server-shared';
// Import the mock client factory from the shared module
// Note: This import path assumes the shared module is built and the integration mock is exported
import { createIntegrationMockTwistClient } from 'twist-mcp-server-shared/build/twist-client/twist-client.integration-mock.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData = {};
  if (process.env.MCP_INTEGRATION_TEST_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.MCP_INTEGRATION_TEST_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse MCP_INTEGRATION_TEST_MOCK_DATA:', e);
    }
  }

  // Create client factory that returns our mock
  const clientFactory = () => createIntegrationMockTwistClient(mockData);

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
