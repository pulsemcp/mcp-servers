#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { createMCPServer } from '../shared/index.js';
import { MockGCSClient } from '../shared/gcs-client/gcs-client.integration-mock.js';
import { logServerStart, logError } from '../shared/logging.js';

// Read version from package.json
const __dirname = dirname(fileURLToPath(import.meta.url));
const packageJsonPath = join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
const VERSION = packageJson.version;

/**
 * Integration test entry point using mock GCS client
 * This allows testing the MCP protocol without real GCS credentials
 */
async function main() {
  const { server, registerHandlers } = createMCPServer({ version: VERSION });

  // Use mock client factory for integration testing
  const mockClientFactory = () =>
    new MockGCSClient({
      bucket: 'test-bucket',
      rootPath: 'test-uploads',
      makePublic: true,
    });

  await registerHandlers(server, mockClientFactory);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('remote-filesystem (integration mock)');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
