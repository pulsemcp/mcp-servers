#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked AppSignalClient.
 * It uses the real MCP server but injects a mock client factory.
 *
 * Mock data is passed via the APPSIGNAL_MOCK_DATA environment variable.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'appsignal-mcp-server-shared';
import { createIntegrationMockAppsignalClient } from 'appsignal-mcp-server-shared/build/appsignal-client/appsignal-client.integration-mock.js';

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData = {};
  if (process.env.APPSIGNAL_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.APPSIGNAL_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse APPSIGNAL_MOCK_DATA:', e);
    }
  }

  // Create client factory that returns our mock
  const clientFactory = () => createIntegrationMockAppsignalClient(mockData);

  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
