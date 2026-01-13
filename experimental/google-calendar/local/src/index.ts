#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

async function main() {
  // Validate required environment variables
  const requiredVars = [
    'GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL',
    'GCAL_SERVICE_ACCOUNT_PRIVATE_KEY',
    'GCAL_IMPERSONATE_EMAIL',
  ];

  const missing = requiredVars.filter((varName) => !process.env[varName]);
  if (missing.length > 0) {
    console.error('Error: Missing required environment variables:');
    for (const varName of missing) {
      console.error(`  - ${varName}`);
    }
    console.error(
      '\nPlease set these environment variables to use the Google Calendar MCP server.'
    );
    console.error('See README.md for setup instructions.');
    process.exit(1);
  }

  try {
    const { server, registerHandlers } = createMCPServer();

    // Register handlers with default client factory
    await registerHandlers(server);

    const transport = new StdioServerTransport();
    await server.connect(transport);

    logServerStart('google-calendar-workspace-mcp-server');
  } catch (error) {
    logError('server-startup', error);
    process.exit(1);
  }
}

main();
