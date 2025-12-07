#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked ExampleClient.
 * It uses the real MCP server but injects a mock client factory.
 *
 * Mock data is passed via the EXAMPLE_MOCK_DATA environment variable.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// Import from shared module via symlink (created by setup-dev.js)
import { createMCPServer } from '../shared/index.js';
// Import the mock client factory from the shared module
import { createIntegrationMockExampleClient } from '../shared/example-client/example-client.integration-mock.js';

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData = {};
  if (process.env.EXAMPLE_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.EXAMPLE_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse EXAMPLE_MOCK_DATA:', e);
    }
  }

  // Create client factory that returns our mock
  const clientFactory = () => createIntegrationMockExampleClient(mockData);

  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
