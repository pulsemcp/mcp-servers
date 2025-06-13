#!/usr/bin/env node
/**
 * Integration Test Server Entry Point
 *
 * This file is used exclusively for integration testing. It's a special version
 * of the MCP server that uses mocked external dependencies instead of real ones.
 *
 * Mock configuration is passed via the APPSIGNAL_MOCK_CONFIG environment variable.
 *
 * DO NOT use this file for production - use index.ts instead.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'mcp-server-appsignal-shared';
import { createConfigurableAppsignalClient } from 'mcp-server-appsignal-shared/dist/appsignal-client/configurable-appsignal-client.integration-mock.js';

async function main() {
  const transport = new StdioServerTransport();

  // Use configurable mock client
  const clientFactory = () => createConfigurableAppsignalClient();

  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
