import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

/**
 * Register shared resources to an MCP server
 */
export function registerResources(server: Server): void {
  // Register resource list handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: [],
  }));

  // Register resource read handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // For now, return empty - resource caching will be implemented later
    throw new Error(`Resource not found: ${uri}`);
  });
}
