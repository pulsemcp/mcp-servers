#!/usr/bin/env node
/**
 * Integration test entry point with mock data.
 * Runs the full MCP server over stdio against an in-memory mock X client so
 * integration tests exercise the real protocol path without hitting the X API.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createMCPServer } from '../shared/index.js';
import { logServerStart, logError } from '../shared/logging.js';
import { createMockXClient } from './mock-x-client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, createMockXClient);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('X (Twitter) (Mock)');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
