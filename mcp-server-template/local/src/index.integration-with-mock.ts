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
import { createMCPServer } from 'mcp-server-NAME-shared';
// Import the mock client factory from the shared module
// Note: This import path assumes the shared module is built and the integration mock is exported
import { createIntegrationMockExampleClient } from '../../shared/src/example-client/example-client.integration-mock.js';

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
