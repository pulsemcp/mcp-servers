#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, AwsS3Client } from '../shared/index.js';
import { logServerStart, logError, logWarning, logInfo } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// =============================================================================
// ENVIRONMENT VALIDATION
// =============================================================================
// Validates required environment variables at startup with helpful error messages.
// =============================================================================

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'AWS_ACCESS_KEY_ID',
      description: 'AWS access key ID for authentication',
      example: 'AKIAIOSFODNN7EXAMPLE',
    },
    {
      name: 'AWS_SECRET_ACCESS_KEY',
      description: 'AWS secret access key for authentication',
      example: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'AWS_REGION',
      description: 'AWS region for S3 operations',
      defaultValue: 'us-east-1',
    },
    {
      name: 'AWS_DEFAULT_REGION',
      description: 'Alternative region variable (fallback)',
      defaultValue: 'us-east-1',
    },
    {
      name: 'AWS_ENDPOINT_URL',
      description: 'Custom S3 endpoint URL (for S3-compatible services like MinIO)',
    },
    {
      name: 'S3_ENABLED_TOOLGROUPS',
      description: 'Comma-separated list of tool groups to enable (readonly, readwrite)',
      defaultValue: 'all groups enabled',
    },
    {
      name: 'S3_ENABLED_TOOLS',
      description: 'Comma-separated list of specific tools to enable (overrides groups)',
    },
    {
      name: 'S3_DISABLED_TOOLS',
      description: 'Comma-separated list of specific tools to disable',
    },
    {
      name: 'S3_BUCKET',
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
    console.error('\nExample commands:');
    missing.forEach(({ name, example }) => {
      console.error(`  export ${name}="${example}"`);
    });
    console.error('----------------------------------------\n');

    process.exit(1);
  }

  // Log warnings for common configuration issues
  if (process.env.S3_ENABLED_TOOLGROUPS) {
    logWarning('config', `Tool groups filter active: ${process.env.S3_ENABLED_TOOLGROUPS}`);
  }
  if (process.env.S3_ENABLED_TOOLS) {
    logWarning('config', `Enabled tools filter active: ${process.env.S3_ENABLED_TOOLS}`);
  }
  if (process.env.S3_DISABLED_TOOLS) {
    logWarning('config', `Disabled tools filter active: ${process.env.S3_DISABLED_TOOLS}`);
  }
  if (process.env.S3_BUCKET) {
    logInfo('config', `Bucket constraint active: ${process.env.S3_BUCKET}`);
  }
}

// =============================================================================
// HEALTH CHECKS
// =============================================================================
// Validates AWS credentials and connectivity before starting the server.
// This prevents silent failures and provides immediate feedback to users.
// Set SKIP_HEALTH_CHECKS=true to disable (useful for testing).
// =============================================================================

async function performHealthChecks(): Promise<void> {
  if (process.env.SKIP_HEALTH_CHECKS === 'true') {
    logWarning('healthcheck', 'Health checks skipped (SKIP_HEALTH_CHECKS=true)');
    return;
  }

  try {
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY!;
    const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || 'us-east-1';
    const endpoint = process.env.AWS_ENDPOINT_URL;
    const constrainedBucket = process.env.S3_BUCKET;

    const client = new AwsS3Client({
      accessKeyId,
      secretAccessKey,
      region,
      endpoint,
    });

    // Try to list buckets to validate credentials
    await client.listBuckets();
    logInfo('healthcheck', 'AWS credentials validated successfully');

    // If S3_BUCKET is set, verify it exists and is accessible
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
    logError('healthcheck', `Failed to validate AWS credentials: ${message}`);
    logError('healthcheck', 'Please check your AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY');
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

  logServerStart('s3-mcp-server');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
