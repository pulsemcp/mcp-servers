import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ResourceStorageFactory } from './storage/index.js';

/**
 * Register shared resources to an MCP server
 */
export function registerResources(server: Server): void {
  // Register resource list handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const storage = await ResourceStorageFactory.create();
    const resources = await storage.list();

    return {
      resources: resources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    };
  });

  // Register resource read handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;
    const storage = await ResourceStorageFactory.create();

    try {
      const content = await storage.read(uri);
      return {
        contents: [
          {
            uri: content.uri,
            mimeType: content.mimeType,
            text: content.text,
            blob: content.blob,
          },
        ],
      };
    } catch {
      throw new Error(`Resource not found: ${uri}`);
    }
  });
}
