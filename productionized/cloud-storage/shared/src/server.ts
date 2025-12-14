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
 *
 * Supports three authentication methods (in order of priority):
 * 1. Individual credential env vars: GCS_CLIENT_EMAIL, GCS_PRIVATE_KEY, GCS_PROJECT_ID
 * 2. Service account key file: GCS_KEY_FILE (path to JSON key file)
 * 3. Application Default Credentials (ADC)
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
    projectId: process.env.GCS_PROJECT_ID,
  };

  // Check for individual credential env vars (highest priority)
  const clientEmail = process.env.GCS_CLIENT_EMAIL;
  const privateKey = process.env.GCS_PRIVATE_KEY;

  if (clientEmail && privateKey) {
    // Use individual credentials
    const projectId = process.env.GCS_PROJECT_ID;
    if (!projectId) {
      throw new Error('GCS_PROJECT_ID is required when using GCS_CLIENT_EMAIL and GCS_PRIVATE_KEY');
    }
    config.credentials = {
      clientEmail,
      privateKey: privateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
      projectId,
    };
  } else if (process.env.GCS_KEY_FILE) {
    // Use key file path
    config.keyFilePath = process.env.GCS_KEY_FILE;
  }
  // If neither, will use Application Default Credentials

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
