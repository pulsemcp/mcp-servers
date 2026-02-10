#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { createIntegrationMockLangfuseClient } from '../shared/langfuse-client/langfuse-client.integration-mock.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const transport = new StdioServerTransport();

  let mockData = {};
  if (process.env.LANGFUSE_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.LANGFUSE_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse LANGFUSE_MOCK_DATA:', e);
    }
  }

  const clientFactory = () => createIntegrationMockLangfuseClient(mockData);

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
