#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked ClaudeCodeClient.
 * It uses the real MCP server but injects a mock client factory.
 */
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
// IMPORTANT: This uses the package name pattern, not a relative path
// Integration mock for claude-code-agent server
// This matches how actual servers import their shared packages for integration tests
import { createMCPServer } from '../shared/index.js';
// Import the mock client factory from the shared module
// Note: This import path assumes the shared module is built and the integration mock is exported
import { MockClaudeCodeClient } from '../../shared/build/claude-code-client/claude-code-client.integration-mock.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const transport = new StdioServerTransport();

  // Create a single mock client instance that will be reused
  const mockClient = new MockClaudeCodeClient();

  // Create client factory that returns our singleton mock
  const clientFactory = () => mockClient;

  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Set required env vars for tests if not already set
  const projectRoot = process.cwd();
  process.env.TRUSTED_SERVERS_PATH =
    process.env.TRUSTED_SERVERS_PATH || `${projectRoot}/servers.md`;
  process.env.SERVER_CONFIGS_PATH =
    process.env.SERVER_CONFIGS_PATH || `${projectRoot}/servers.json`;

  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
