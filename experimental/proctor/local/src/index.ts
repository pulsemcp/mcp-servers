#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// Validate required environment variables before starting
function validateEnvironment(): void {
  const required: { name: string; description: string }[] = [
    {
      name: 'PROCTOR_API_KEY',
      description: 'API key for PulseMCP Proctor API authentication',
    },
  ];

  const optional: { name: string; description: string }[] = [
    {
      name: 'PROCTOR_API_URL',
      description: 'Base URL for Proctor API (default: https://admin.pulsemcp.com)',
    },
    {
      name: 'TOOL_GROUPS',
      description: 'Comma-separated list of enabled tool groups (default: all)',
    },
  ];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');
    missing.forEach(({ name, description }) => {
      console.error(`  - ${name}: ${description}`);
    });

    if (optional.length > 0) {
      console.error('\nOptional environment variables:');
      optional.forEach(({ name, description }) => {
        console.error(`  - ${name}: ${description}`);
      });
    }

    console.error('\nPlease set the required environment variables and try again.');
    console.error('Example:');
    console.error('  export PROCTOR_API_KEY="your-api-key"');
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

  logServerStart('proctor-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
