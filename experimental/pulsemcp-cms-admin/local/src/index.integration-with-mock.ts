#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked PulseMCPAdminClient.
 * It uses the real MCP server but injects a mock client factory.
 *
 * Mock data is passed via the PULSEMCP_MOCK_DATA environment variable.
 */
import { existsSync, readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
// IMPORTANT: This uses the package name pattern, not a relative path
import { createMCPServer } from 'pulsemcp-cms-admin-mcp-server-shared';
// Import the mock client factory from the shared module
import { createMockPulseMCPAdminClient } from '../../shared/src/pulsemcp-admin-client/pulsemcp-admin-client.integration-mock.js';

// Read version from package.json. The integration build emits this entry into a
// nested build/ layout (build/local/src/), so walk up from the module directory
// to locate the package.json that carries the version rather than assuming a
// fixed depth.
function readVersion(): string {
  let dir = dirname(fileURLToPath(import.meta.url));
  for (let i = 0; i < 6; i++) {
    const candidate = join(dir, 'package.json');
    if (existsSync(candidate)) {
      return JSON.parse(readFileSync(candidate, 'utf-8')).version;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return '0.0.0';
}
const VERSION = readVersion();

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData = {};
  if (process.env.PULSEMCP_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.PULSEMCP_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse PULSEMCP_MOCK_DATA:', e);
    }
  }

  // Create client factory that returns our mock
  const clientFactory = () => createMockPulseMCPAdminClient(mockData);

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
