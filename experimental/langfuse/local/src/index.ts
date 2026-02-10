#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError, logWarning } from '../shared/logging.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

function validateEnvironment(): void {
  const required: { name: string; description: string; example: string }[] = [
    {
      name: 'LANGFUSE_SECRET_KEY',
      description: 'Langfuse secret key for API authentication',
      example: 'sk-lf-...',
    },
    {
      name: 'LANGFUSE_PUBLIC_KEY',
      description: 'Langfuse public key for API authentication',
      example: 'pk-lf-...',
    },
  ];

  const optional: { name: string; description: string; defaultValue?: string }[] = [
    {
      name: 'LANGFUSE_BASE_URL',
      description: 'Langfuse API base URL',
      defaultValue: 'https://cloud.langfuse.com',
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

  if (process.env.LANGFUSE_BASE_URL) {
    logWarning('config', `Custom base URL: ${process.env.LANGFUSE_BASE_URL}`);
  }
}

async function main() {
  validateEnvironment();

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('Langfuse');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
