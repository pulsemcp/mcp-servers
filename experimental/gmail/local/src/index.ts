#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const missing: string[] = [];

  if (!process.env.GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL) {
    missing.push('GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL');
  }
  if (!process.env.GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY) {
    missing.push('GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY');
  }
  if (!process.env.GMAIL_IMPERSONATE_EMAIL) {
    missing.push('GMAIL_IMPERSONATE_EMAIL');
  }

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');

    console.error('\nThis MCP server requires a Google Cloud service account with');
    console.error('domain-wide delegation to access Gmail on behalf of users.');
    console.error('\nRequired environment variables:');
    console.error('  GMAIL_SERVICE_ACCOUNT_CLIENT_EMAIL: Service account email address');
    console.error('    Example: my-service-account@my-project.iam.gserviceaccount.com');
    console.error('  GMAIL_SERVICE_ACCOUNT_PRIVATE_KEY: Service account private key (PEM format)');
    console.error('    Example: -----BEGIN PRIVATE KEY-----\\nMIIE...\\n-----END PRIVATE KEY-----');
    console.error('  GMAIL_IMPERSONATE_EMAIL: Email address to impersonate');
    console.error('    Example: user@yourdomain.com');
    console.error('\nSetup steps:');
    console.error('  1. Go to https://console.cloud.google.com/');
    console.error('  2. Create a service account with domain-wide delegation');
    console.error('  3. In Google Workspace Admin, grant gmail.readonly scope');
    console.error('  4. Download the JSON key file and extract client_email and private_key');
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
