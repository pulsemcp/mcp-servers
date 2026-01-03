#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'GMAIL_ACCESS_TOKEN',
      description: 'Gmail API OAuth2 access token',
      example: 'ya29.a0AfH6SMB...',
    },
  ];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');

    missing.forEach(({ name, description, example }) => {
      console.error(`  - ${name}: ${description}`);
      console.error(`    Example: ${example}`);
    });

    console.error('\n----------------------------------------');
    console.error('Please set the required environment variables and try again.');
    console.error('\nTo get an access token:');
    console.error('1. Go to https://console.cloud.google.com/');
    console.error('2. Create or select a project');
    console.error('3. Enable the Gmail API');
    console.error('4. Create OAuth2 credentials');
    console.error('5. Use the OAuth2 flow to get an access token');
    console.error('   Required scopes: gmail.readonly');
    console.error('----------------------------------------\n');

    process.exit(1);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Create server using factory
  const { server, registerHandlers } = createMCPServer();

  // Step 3: Register all handlers (tools)
  await registerHandlers(server);

  // Step 4: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Gmail');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
