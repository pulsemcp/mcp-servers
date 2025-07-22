#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked PulseMCPAdminClient.
 * It uses the real MCP server but injects a mock client factory.
 *
 * Mock data is passed via the PULSEMCP_MOCK_DATA environment variable.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// IMPORTANT: This uses the package name pattern, not a relative path
import { createMCPServer } from 'pulsemcp-cms-admin-mcp-server-shared';
// Import the mock client factory from the shared module
import { createMockPulseMCPAdminClient } from '../../shared/src/pulsemcp-admin-client/pulsemcp-admin-client.integration-mock.js';

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData = {};
  if (process.env.PULSEMCP_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.PULSEMCP_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse PULSEMCP_MOCK_DATA:', e);
    }
  }

  // Create client factory that returns our mock
  const clientFactory = () => createMockPulseMCPAdminClient(mockData);

  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
