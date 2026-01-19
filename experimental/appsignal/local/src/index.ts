#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logDebug } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

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
    logError('validateEnvironment', 'Missing required environment variables:');
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
    logDebug(
      'validateEnvironment',
      'APPSIGNAL_APP_ID is set, app selection will be locked to this ID'
    );
  }
}

async function main() {
  // Validate environment variables first
  validateEnvironment();

  // Start server with default production client
  const transport = new StdioServerTransport();
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  await registerHandlers(server);
  await server.connect(transport);

  logServerStart('AppSignal');
}

// Run the server
main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
