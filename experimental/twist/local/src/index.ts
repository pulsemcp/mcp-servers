#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// Validate required environment variables before starting
function validateEnvironment(): void {
  const required = [
    { name: 'TWIST_BEARER_TOKEN', description: 'Twist API bearer token for authentication' },
    { name: 'TWIST_WORKSPACE_ID', description: 'Twist workspace ID to operate within' },
  ];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');
    missing.forEach(({ name, description }) => {
      console.error(`  - ${name}: ${description}`);
    });
    console.error('\nPlease set these environment variables and try again.');
    console.error('Example:');
    console.error('  export TWIST_BEARER_TOKEN="your-bearer-token"');
    console.error('  export TWIST_WORKSPACE_ID="your-workspace-id"');
    process.exit(1);
  }
}

async function main() {
  // Validate environment variables first
  validateEnvironment();

  // Create server using factory
  const { server, registerHandlers } = createMCPServer();

  // Register all handlers (resources and tools)
  await registerHandlers(server);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Twist');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
