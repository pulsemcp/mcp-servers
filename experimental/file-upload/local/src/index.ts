#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'GCS_BUCKET',
      description: 'Google Cloud Storage bucket name',
      example: 'my-remote-filesystem',
    },
  ];

  const credentialOptions = [
    {
      names: ['GCS_CLIENT_EMAIL', 'GCS_PRIVATE_KEY'],
      description: 'Inline service account credentials',
    },
    {
      names: ['GOOGLE_APPLICATION_CREDENTIALS'],
      description: 'Path to service account key file',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'GCS_PROJECT_ID',
      description: 'Google Cloud project ID',
      defaultValue: 'from credentials',
    },
    {
      name: 'GCS_ROOT_PATH',
      description: 'Root path prefix - server cannot access above this path',
      defaultValue: 'none (full bucket access)',
    },
    {
      name: 'GCS_MAKE_PUBLIC',
      description: 'Whether to make uploaded files publicly accessible by default',
      defaultValue: 'false',
    },
    {
      name: 'ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of enabled tool groups (readonly, readwrite)',
      defaultValue: 'all groups enabled',
    },
  ];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');

    missing.forEach(({ name, description, example }) => {
      console.error(`  - ${name}: ${description}`);
      console.error(`    Example: ${example}`);
    });

    console.error('\nCredential options (choose one):');
    credentialOptions.forEach(({ names, description }) => {
      console.error(`  Option: ${names.join(' + ')}`);
      console.error(`    ${description}`);
    });

    if (optional.length > 0) {
      console.error('\nOptional environment variables:');
      optional.forEach(({ name, description, defaultValue }) => {
        const defaultStr = defaultValue ? ` (default: ${defaultValue})` : '';
        console.error(`  - ${name}: ${description}${defaultStr}`);
      });
    }

    console.error('\n----------------------------------------');
    console.error('Please set the required environment variables and try again.');
    console.error('\nExample with inline credentials:');
    console.error('  export GCS_BUCKET="my-bucket"');
    console.error('  export GCS_PROJECT_ID="my-project"');
    console.error('  export GCS_CLIENT_EMAIL="sa@project.iam.gserviceaccount.com"');
    console.error('  export GCS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\\n..."');
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Validate credentials are provided
  const hasInlineCreds = process.env.GCS_CLIENT_EMAIL && process.env.GCS_PRIVATE_KEY;
  const hasKeyFile = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!hasInlineCreds && !hasKeyFile) {
    logWarning(
      'config',
      'No explicit credentials provided. Using Application Default Credentials (ADC).'
    );
  }

  // Log configuration info
  if (process.env.GCS_ROOT_PATH) {
    logWarning('config', `Root path constraint: ${process.env.GCS_ROOT_PATH}`);
  }

  if (process.env.GCS_MAKE_PUBLIC === 'true') {
    logWarning('config', 'Files will be made public by default');
  } else {
    logWarning('config', 'Files will be private by default (signed URLs used)');
  }

  if (process.env.ENABLED_TOOLGROUPS) {
    logWarning('config', `Enabled tool groups: ${process.env.ENABLED_TOOLGROUPS}`);
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

  // Step 3: Register all handlers (resources and tools)
  await registerHandlers(server);

  // Step 4: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('remote-filesystem-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
