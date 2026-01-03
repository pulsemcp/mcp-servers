#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const hasServiceAccount =
    process.env.GMAIL_SERVICE_ACCOUNT_KEY_FILE && process.env.GMAIL_IMPERSONATE_EMAIL;
  const hasAccessToken = !!process.env.GMAIL_ACCESS_TOKEN;

  if (!hasServiceAccount && !hasAccessToken) {
    logError('validateEnvironment', 'Missing required environment variables:');

    console.error('\nGmail authentication requires ONE of the following:');
    console.error('\n========== Option 1: Service Account (Recommended) ==========');
    console.error('  GMAIL_SERVICE_ACCOUNT_KEY_FILE: Path to service account JSON key file');
    console.error('    Example: /path/to/service-account.json');
    console.error('  GMAIL_IMPERSONATE_EMAIL: Email address to impersonate');
    console.error('    Example: user@yourdomain.com');
    console.error('\n  Setup steps:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create a service account with domain-wide delegation');
    console.error('  3. In Google Workspace Admin, grant gmail.readonly scope');
    console.error('  4. Download the JSON key file');

    console.error('\n========== Option 2: OAuth2 Access Token ==========');
    console.error('  GMAIL_ACCESS_TOKEN: Gmail API OAuth2 access token');
    console.error('    Example: ya29.a0AfH6SMB...');
    console.error('\n  Setup steps:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create OAuth2 credentials');
    console.error('  3. Use OAuth2 flow to get an access token');
    console.error('   Required scopes: gmail.readonly');

    console.error('\n======================================================\n');

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
