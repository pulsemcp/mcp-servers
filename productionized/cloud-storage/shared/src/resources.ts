import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { StorageClientFactory } from './server.js';

// =============================================================================
// RESOURCES IMPLEMENTATION
// =============================================================================
// Resources expose files stored in cloud storage as MCP resources.
// Each file in the bucket is exposed as a readable resource.
// =============================================================================

const RESOURCE_URI_PREFIX = 'cloud-storage://';

/**
 * Create a resource registration function with the storage client factory
 */
export function createRegisterResources(clientFactory: StorageClientFactory) {
  return (server: Server) => {
    // List available resources (all files in the bucket)
    server.setRequestHandler(ListResourcesRequestSchema, async () => {
      try {
        const client = clientFactory();
        const files = await client.listAllFiles();

        // Always include the config resource
        const resources = [
          {
            uri: `${RESOURCE_URI_PREFIX}config`,
            name: 'Server Configuration',
            description:
              'Current server configuration and status. Useful for debugging and verifying setup.',
            mimeType: 'application/json',
          },
          // Map all files to resources
          ...files.map((file) => ({
            uri: `${RESOURCE_URI_PREFIX}file/${file.path}`,
            name: file.path,
            description: `File: ${file.path} (${formatBytes(file.size)}, ${file.contentType})`,
            mimeType: file.contentType,
          })),
        ];

        return { resources };
      } catch {
        // If we can't list files, at least return the config resource
        return {
          resources: [
            {
              uri: `${RESOURCE_URI_PREFIX}config`,
              name: 'Server Configuration',
              description:
                'Current server configuration and status. Useful for debugging and verifying setup.',
              mimeType: 'application/json',
            },
          ],
        };
      }
    });

    // Read resource contents
    server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      // =========================================================================
      // CONFIG RESOURCE - Server Status and Configuration
      // =========================================================================
      if (uri === `${RESOURCE_URI_PREFIX}config`) {
        const config = {
          server: {
            name: 'cloud-storage-mcp-server',
            version: '0.1.0',
            transport: 'stdio',
          },
          environment: {
            // Show which environment variables are configured (masked for security)
            GCS_BUCKET: process.env.GCS_BUCKET ? '***configured***' : 'not set',
            GCS_ROOT_DIRECTORY: process.env.GCS_ROOT_DIRECTORY || 'not set (bucket root)',
            GCS_PROJECT_ID: process.env.GCS_PROJECT_ID ? '***configured***' : 'not set',
            GCS_KEY_FILE: process.env.GCS_KEY_FILE ? '***configured***' : 'not set',
            ENABLED_TOOLGROUPS: process.env.ENABLED_TOOLGROUPS || 'all (default)',
          },
          capabilities: {
            tools: ['save_file', 'get_file', 'search_files', 'delete_file'],
            resources: true,
          },
          provider: 'gcs',
          futureProviders: ['s3'],
        };

        return {
          contents: [
            {
              uri: `${RESOURCE_URI_PREFIX}config`,
              mimeType: 'application/json',
              text: JSON.stringify(config, null, 2),
            },
          ],
        };
      }

      // =========================================================================
      // FILE RESOURCES - Files from cloud storage
      // =========================================================================
      if (uri.startsWith(`${RESOURCE_URI_PREFIX}file/`)) {
        const filePath = uri.substring(`${RESOURCE_URI_PREFIX}file/`.length);

        try {
          const client = clientFactory();
          const result = await client.getFile(filePath);

          // For text-based content, return as text
          // For binary content, indicate it's binary
          let text: string;
          if (typeof result.content === 'string') {
            text = result.content;
          } else {
            // Binary content - return a placeholder message
            text = `[Binary content - ${result.metadata.size} bytes]\n\nUse the get_file tool with local_file_path to download binary files.`;
          }

          return {
            contents: [
              {
                uri,
                mimeType: result.metadata.contentType,
                text,
              },
            ],
          };
        } catch (error) {
          throw new Error(
            `Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      throw new Error(`Resource not found: ${uri}`);
    });
  };
}

/**
 * Format bytes to human-readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
