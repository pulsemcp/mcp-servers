#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'mcp-server-appsignal-shared';
import { createConfigurableAppsignalClient } from 'mcp-server-appsignal-shared/dist/mocks/configurable-appsignal-client.mock.js';

// This is the integration testing version with configurable mocks
// It reads mock configuration from environment or file

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