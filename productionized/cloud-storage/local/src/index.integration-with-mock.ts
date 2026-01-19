#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Storage Client Factory
 *
 * This file is used for integration testing with a mocked storage client.
 * It uses the real MCP server but injects a mock client factory.
 *
 * Mock data is passed via the STORAGE_MOCK_DATA environment variable.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { createMockStorageClient } from '../shared/storage-client/mock-client.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData: Record<string, unknown> = {};
  if (process.env.STORAGE_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.STORAGE_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse STORAGE_MOCK_DATA:', e);
    }
  }

  // Create a single mock client instance that persists across all tool calls
  const mockClient = createMockStorageClient(mockData);

  // Create client factory that returns the same mock instance
  const clientFactory = () => mockClient;

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
