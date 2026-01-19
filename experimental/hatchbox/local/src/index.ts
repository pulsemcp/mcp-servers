#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

// Validate required environment variables before starting
function validateEnvironment(): void {
  const required: { name: string; description: string }[] = [
    { name: 'HATCHBOX_API_KEY', description: 'Hatchbox API key for authentication' },
    { name: 'HATCHBOX_ACCOUNT_ID', description: 'Your Hatchbox account ID' },
    { name: 'HATCHBOX_APP_ID', description: 'Your Hatchbox application ID' },
    { name: 'HATCHBOX_DEPLOY_KEY', description: 'Deployment webhook key' },
  ];

  const optional: { name: string; description: string }[] = [];

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
    console.error('  export HATCHBOX_API_KEY="your-api-key"');
    console.error('  export HATCHBOX_ACCOUNT_ID="1852"');
    console.error('  export HATCHBOX_APP_ID="8540"');
    console.error('  export HATCHBOX_DEPLOY_KEY="your-deploy-key"');
    process.exit(1);
  }
}

async function main() {
  // Validate environment variables first
  validateEnvironment();

  // Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Register all handlers (resources and tools)
  await registerHandlers(server);

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Hatchbox');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
