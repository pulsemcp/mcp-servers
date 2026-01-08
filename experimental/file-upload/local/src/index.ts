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
      description: 'Google Cloud Storage bucket name for uploads',
      example: 'my-project-screenshots',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'GCS_PROJECT_ID',
      description: 'Google Cloud project ID (optional if using default credentials)',
      defaultValue: 'from credentials',
    },
    {
      name: 'GOOGLE_APPLICATION_CREDENTIALS',
      description: 'Path to service account key file (optional if using default credentials)',
      defaultValue: 'from environment',
    },
    {
      name: 'GCS_BASE_PATH',
      description: 'Base path prefix for uploads (e.g., "screenshots/")',
      defaultValue: 'none',
    },
    {
      name: 'GCS_MAKE_PUBLIC',
      description: 'Whether to make uploaded files publicly accessible',
      defaultValue: 'true',
    },
  ];

  const missing = required.filter(({ name }) => !process.env[name]);

  if (missing.length > 0) {
    logError('validateEnvironment', 'Missing required environment variables:');

    missing.forEach(({ name, description, example }) => {
      console.error(`  - ${name}: ${description}`);
      console.error(`    Example: ${example}`);
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
    console.error('\nExample commands:');
    missing.forEach(({ name, example }) => {
      console.error(`  export ${name}="${example}"`);
    });
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Log info about configuration
  if (process.env.GCS_BASE_PATH) {
    logWarning('config', `Using base path: ${process.env.GCS_BASE_PATH}`);
  }

  if (process.env.GCS_MAKE_PUBLIC === 'false') {
    logWarning('config', 'Files will NOT be made public - signed URLs will be used');
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

  logServerStart('file-upload');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
