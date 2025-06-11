#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'mcp-server-appsignal-shared';
import { createMockAppsignalClient } from 'mcp-server-appsignal-shared/dist/mocks/appsignal-client.mock.js';

// This is the integration testing version of the server
// It uses mocked external dependencies for predictable testing

async function main() {
  const transport = new StdioServerTransport();
  
  // Use mocked client for integration testing
  const clientFactory = () => createMockAppsignalClient();
  
  const { server, registerHandlers } = createMCPServer();
  await registerHandlers(server, clientFactory);
  
  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});