#!/usr/bin/env node
import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'mcp-server-appsignal-shared';

async function main() {
  // Start server with default production client
  const transport = new StdioServerTransport();
  const { server, registerHandlers } = createMCPServer();

  await registerHandlers(server);
  await server.connect(transport);

  console.error('AppSignal MCP server running on stdio');
}

// Run the server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
