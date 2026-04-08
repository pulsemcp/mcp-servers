import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ScreenshotStorageFactory, VideoStorageFactory } from './storage/index.js';

/**
 * Register screenshot and video resources handlers to an MCP server
 */
export function registerResources(server: Server): void {
  // Register resource list handler
  server.setRequestHandler(ListResourcesRequestSchema, async () => {
    const screenshotStorage = await ScreenshotStorageFactory.create();
    const screenshotResources = await screenshotStorage.list();

    const videoStorage = await VideoStorageFactory.create();
    const videoResources = await videoStorage.list();

    const allResources = [
      ...screenshotResources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
      ...videoResources.map((resource) => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
      })),
    ];

    return { resources: allResources };
  });

  // Register resource read handler
  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const { uri } = request.params;

    // Route to the correct storage based on file extension
    if (uri.endsWith('.webm')) {
      const videoStorage = await VideoStorageFactory.create();
      if (await videoStorage.exists(uri)) {
        const content = await videoStorage.read(uri);
        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              blob: content.blob,
            },
          ],
        };
      }
    } else {
      const screenshotStorage = await ScreenshotStorageFactory.create();
      if (await screenshotStorage.exists(uri)) {
        const content = await screenshotStorage.read(uri);
        return {
          contents: [
            {
              uri: content.uri,
              mimeType: content.mimeType,
              blob: content.blob,
            },
          ],
        };
      }
    }

    throw new Error(`Resource not found: ${uri}`);
  });
}
