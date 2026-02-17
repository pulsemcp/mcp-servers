#!/usr/bin/env node
/**
 * Integration Test Server Entry Point with Mock Client Factory
 *
 * This file is used for integration testing with a mocked PointsYeahClient.
 * Mock data is passed via the POINTSYEAH_MOCK_DATA environment variable.
 */
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer, setAuthenticated, setRefreshToken } from '../shared/index.js';
import { createIntegrationMockPointsYeahClient } from '../shared/pointsyeah-client/pointsyeah-client.integration-mock.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

async function main() {
  const transport = new StdioServerTransport();

  // Parse mock data from environment variable
  let mockData = {};
  if (process.env.POINTSYEAH_MOCK_DATA) {
    try {
      mockData = JSON.parse(process.env.POINTSYEAH_MOCK_DATA);
    } catch (e) {
      console.error('Failed to parse POINTSYEAH_MOCK_DATA:', e);
    }
  }

  // Integration tests use mocked data, so auth is always "valid"
  setRefreshToken('mock-token');
  setAuthenticated(true);

  const clientFactory = () => createIntegrationMockPointsYeahClient(mockData);

  const { server, registerHandlers } = createMCPServer({ version: VERSION });
  await registerHandlers(server, clientFactory);

  await server.connect(transport);
}

main().catch((error) => {
  console.error('Server error:', error);
  process.exit(1);
});
