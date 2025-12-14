import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterResources } from './resources.js';
import { createRegisterTools } from './tools.js';
import { IStorageClient, GCSConfig } from './storage-client/types.js';
import { GCSStorageClient } from './storage-client/gcs-client.js';

// Re-export storage client types for convenience
export type { IStorageClient, GCSConfig } from './storage-client/types.js';
export { GCSStorageClient } from './storage-client/gcs-client.js';

/**
 * Factory function type for creating storage clients
 */
export type StorageClientFactory = () => IStorageClient;

/**
 * Create a GCS storage client from environment variables
 */
export function createDefaultStorageClient(): IStorageClient {
  const bucket = process.env.GCS_BUCKET;

  if (!bucket) {
    throw new Error('GCS_BUCKET environment variable must be configured');
  }

  const config: GCSConfig = {
    provider: 'gcs',
    bucket,
    rootDirectory: process.env.GCS_ROOT_DIRECTORY,
    keyFilePath: process.env.GCS_KEY_FILE,
    projectId: process.env.GCS_PROJECT_ID,
  };

  return new GCSStorageClient(config);
}

/**
 * Create the MCP server for cloud storage operations
 */
export function createMCPServer() {
  const server = new Server(
    {
      name: 'cloud-storage-mcp-server',
      version: '0.1.0',
    },
    {
      capabilities: {
        resources: {},
        tools: {},
      },
    }
  );

  const registerHandlers = async (
    server: Server,
    clientFactory?: StorageClientFactory
  ): Promise<void> => {
    // Use provided factory or create default client
    const factory = clientFactory || createDefaultStorageClient;

    // Register resources (dynamic file listing)
    const registerResources = createRegisterResources(factory);
    registerResources(server);

    // Register tools (save, get, search, delete)
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
