#!/usr/bin/env node
import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';

// Validate required environment variables before starting
function validateEnvironment(): void {
  const required = [
    { name: 'APPSIGNAL_API_KEY', description: 'AppSignal API key for authentication' },
  ];

  const optional = [
    {
      name: 'APPSIGNAL_APP_ID',
      description: 'AppSignal application ID (optional - can be selected dynamically)',
    },
  ];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    console.error('Error: Missing required environment variables:');
    missing.forEach(({ name, description }) => {
      console.error(`  - ${name}: ${description}`);
    });
    console.error('\nOptional environment variables:');
    optional.forEach(({ name, description }) => {
      console.error(`  - ${name}: ${description}`);
    });
    console.error('\nPlease set the required environment variables and try again.');
    console.error('Example:');
    console.error('  export APPSIGNAL_API_KEY="your-api-key"');
    console.error('  export APPSIGNAL_APP_ID="your-app-id" # Optional');
    process.exit(1);
  }

  // Log if optional variables are set
  if (process.env.APPSIGNAL_APP_ID) {
    console.error('Note: APPSIGNAL_APP_ID is set, app selection will be locked to this ID');
  }
}

async function main() {
  // Validate environment variables first
  validateEnvironment();

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
