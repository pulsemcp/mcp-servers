#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, GoogleCloudStorageClient } from '../shared/index.js';
import { logServerStart, logError, logWarning, logInfo } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'GCS_PROJECT_ID',
      description: 'Google Cloud project ID',
      example: 'my-project-id',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'GCS_SERVICE_ACCOUNT_KEY_FILE',
      description: 'Path to service account key JSON file',
    },
    {
      name: 'GCS_SERVICE_ACCOUNT_KEY_JSON',
      description: 'Service account key JSON contents (inline)',
    },
    {
      name: 'GCS_ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly, readwrite)',
      defaultValue: 'all groups enabled',
    },
    {
      name: 'GCS_ENABLED_TOOLS',
      description: 'Comma-separated list of specific tools to enable (overrides groups)',
    },
    {
      name: 'GCS_DISABLED_TOOLS',
      description: 'Comma-separated list of specific tools to disable',
    },
    {
      name: 'GCS_BUCKET',
      description: 'Constrain all operations to a single bucket (hides bucket-level tools)',
    },
    {
      name: 'SKIP_HEALTH_CHECKS',
      description: 'Skip health checks on startup (set to "true" to skip)',
      defaultValue: 'false',
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
    console.error('\nAuthentication options:');
    console.error('  1. Set GCS_SERVICE_ACCOUNT_KEY_FILE to a service account key file path');
    console.error('  2. Set GCS_SERVICE_ACCOUNT_KEY_JSON with inline JSON credentials');
    console.error(
      '  3. Use Application Default Credentials (gcloud auth application-default login)'
    );
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Log warnings for common configuration issues
  if (process.env.GCS_ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.GCS_ENABLED_TOOLGROUPS}`);
  }
  if (process.env.GCS_ENABLED_TOOLS) {
    logWarning('config', `Enabled tools filter active: ${process.env.GCS_ENABLED_TOOLS}`);
  }
  if (process.env.GCS_DISABLED_TOOLS) {
    logWarning('config', `Disabled tools filter active: ${process.env.GCS_DISABLED_TOOLS}`);
  }
  if (process.env.GCS_BUCKET) {
    logInfo('config', `Bucket constraint active: ${process.env.GCS_BUCKET}`);
  }
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================

async function performHealthChecks(): Promise<void> {
  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return;
  }

  try {
    const projectId = process.env.GCS_PROJECT_ID!;
    const keyFilePath = process.env.GCS_SERVICE_ACCOUNT_KEY_FILE;
    const keyFileContents = process.env.GCS_SERVICE_ACCOUNT_KEY_JSON;
    const constrainedBucket = process.env.GCS_BUCKET;

    const client = new GoogleCloudStorageClient({
      projectId,
      keyFilePath,
      keyFileContents,
    });

    // Try to list buckets to validate credentials
    await client.listBuckets();
    logInfo('healthcheck', 'GCS credentials validated successfully');

    // If GCS_BUCKET is set, verify it exists and is accessible
    if (constrainedBucket) {
      const bucketExists = await client.headBucket(constrainedBucket);
      if (!bucketExists) {
        logError(
          'healthcheck',
          `Constrained bucket "${constrainedBucket}" does not exist or is not accessible`
        );
        process.exit(1);
      }
      logInfo('healthcheck', `Constrained bucket "${constrainedBucket}" verified`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logError('healthcheck', `Failed to validate GCS credentials: ${message}`);
    logError('healthcheck', 'Please check your GCS_PROJECT_ID and authentication configuration');
    process.exit(1);
  }
}

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // Step 1: Validate environment variables
  validateEnvironment();

  // Step 2: Perform health checks (validates credentials, connectivity)
  await performHealthChecks();

  // Step 3: Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Step 4: Register all handlers (resources and tools)
  await registerHandlers(server);

  // Step 5: Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('gcs-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
