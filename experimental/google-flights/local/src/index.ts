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

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

async function main() {
  // No required environment variables — Google Flights uses public HTTP endpoints.
  // No health checks needed — the first search will validate connectivity.

  // Create server using factory
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Register all handlers (resources and tools)
  await registerHandlers(server);

  // Start server with stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('google-flights-mcp-server');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
