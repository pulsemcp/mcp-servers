#!/usr/bin/env node
/**
 * Integration test entry point with mocked Monarch client.
 *
 * Drives a real MCP server over stdio with the live tool surface, but swaps
 * in `createIntegrationMockMonarchClient` for the API client. Mock data is
 * supplied via the `MCP_INTEGRATION_TEST_MOCK_DATA` env var as JSON.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from 'monarch-money-mcp-server-shared';
import { createIntegrationMockMonarchClient } from 'monarch-money-mcp-server-shared/build/monarch-client/client.integration-mock.js';
import { createMemorySessionStore } from 'monarch-money-mcp-server-shared/build/monarch-client/session-store.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const transport = new StdioServerTransport();

  let mockData = {};
  if (process.env.MCP_INTEGRATION_TEST_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.MCP_INTEGRATION_TEST_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse MCP_INTEGRATION_TEST_MOCK_DATA:', e);
    }
  }

  // Pre-seed the in-memory session store so check_auth_status thinks we have
  // a session and the mock client returns the canned `me` response.
  const sessionStore = createMemorySessionStore({
    token: 'integration-mock-token',
    obtainedAt: new Date().toISOString(),
  });

  // Memoize the mock client so in-memory state (e.g. rules created during a
  // test) persists across tool calls within a single server process.
  let mockClient: ReturnType<typeof createIntegrationMockMonarchClient> | null = null;
  const clientFactory = async () => (mockClient ??= createIntegrationMockMonarchClient(mockData));

  const { server, registerHandlers } = createMCPServer({
    version: VERSION,
    sessionStore,
  });
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
