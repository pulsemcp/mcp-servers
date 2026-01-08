#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createMCPServer } from '../shared/index.js';
import { MockGCSClient } from '../shared/gcs-client/gcs-client.integration-mock.js';
import { logServerStart, logError } from '../shared/logging.js';

/**
 * Integration test entry point using mock GCS client
 * This allows testing the MCP protocol without real GCS credentials
 */
async function main() {
  const { server, registerHandlers } = createMCPServer();

  // Use mock client factory for integration testing
  const mockClientFactory = () =>
    new MockGCSClient({
      bucket: 'test-bucket',
      basePath: 'test-uploads/',
      makePublic: true,
    });

  await registerHandlers(server, mockClientFactory);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logServerStart('file-upload (integration mock)');
}

main().catch((error) => {
  logError('main', error);
  process.exit(1);
});
