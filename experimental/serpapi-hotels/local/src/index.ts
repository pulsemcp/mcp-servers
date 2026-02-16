#!/usr/bin/env node
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

function validateEnvironment(): void {
  const apiKey = process.env.SERPAPI_API_KEY;

  if (!apiKey) {
    console.error('Error: SERPAPI_API_KEY environment variable is required.');
    console.error('');
    console.error('Get your API key from: https://serpapi.com/manage-api-key');
    console.error('');
    console.error('Set it in your environment:');
    console.error('  export SERPAPI_API_KEY=your_api_key_here');
    console.error('');
    console.error('Or in your Claude Desktop config:');
    console.error('  "env": { "SERPAPI_API_KEY": "your_api_key_here" }');
    process.exit(1);
  }
}

async function main() {
  validateEnvironment();

  const { server, registerHandlers } = createMCPServer({
    version: VERSION,
    apiKey: process.env.SERPAPI_API_KEY,
  });
  await registerHandlers(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('serpapi-hotels-mcp-server');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
