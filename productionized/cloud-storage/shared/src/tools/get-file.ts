import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IStorageClient } from '../storage-client/types.js';
import { writeFileSync } from 'fs';

// =============================================================================
// PARAMETER DESCRIPTIONS
// =============================================================================

const PARAM_DESCRIPTIONS = {
  path:
    'The path/key of the file to retrieve from the bucket. ' +
    'Examples: "documents/report.pdf", "data/config.json"',
  local_file_path:
    'Optional local path to save the file content to. ' +
    'Use this for binary files or large files to preserve context window. ' +
    'When provided, the file content is written to this path instead of being returned inline. ' +
    'Example: "/tmp/downloaded-report.pdf"',
  include_content:
    'Whether to include the file content in the response. ' +
    'Set to false to only retrieve metadata without the content. ' +
    'Default: true (unless local_file_path is provided)',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const GetFileSchema = z.object({
  path: z.string().min(1).describe(PARAM_DESCRIPTIONS.path),
  local_file_path: z.string().optional().describe(PARAM_DESCRIPTIONS.local_file_path),
  include_content: z.boolean().optional().describe(PARAM_DESCRIPTIONS.include_content),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Get a file from cloud storage.

Retrieves file content and metadata from the specified path in the cloud storage bucket.

**Parameters:**
- \`path\` (required): The file path in the bucket to retrieve
- \`local_file_path\`: Save content to a local file instead of returning inline (preserves context window for binary/large files)
- \`include_content\`: Whether to include file content in response (default: true unless saving to local file)

**Returns:**
JSON object with file metadata and optionally the content. For text files, content is returned as a string. For binary files, it's recommended to use local_file_path.

**Use cases:**
- Read configuration or data files from cloud storage
- Download binary files (images, PDFs) to local path for further processing
- Check file metadata without downloading content (set include_content: false)

**Note:** For large binary files, use \`local_file_path\` to avoid filling up the context window.`;

// =============================================================================
// TOOL FACTORY
// =============================================================================

export function getFileTool(_server: Server, clientFactory: () => IStorageClient) {
  return {
    name: 'get_file',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.path,
        },
        local_file_path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.local_file_path,
        },
        include_content: {
          type: 'boolean',
          default: true,
          description: PARAM_DESCRIPTIONS.include_content,
        },
      },
      required: ['path'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetFileSchema.parse(args);
        const client = clientFactory();

        const result = await client.getFile(validatedArgs.path);

        // Determine whether to include content in response
        const shouldIncludeContent = validatedArgs.local_file_path
          ? (validatedArgs.include_content ?? false)
          : (validatedArgs.include_content ?? true);

        // If local_file_path is provided, write content to file
        if (validatedArgs.local_file_path) {
          const contentBuffer =
            typeof result.content === 'string'
              ? Buffer.from(result.content, 'utf-8')
              : result.content;
          writeFileSync(validatedArgs.local_file_path, contentBuffer);
        }

        // Build response
        const response: Record<string, unknown> = {
          success: true,
          file: {
            path: result.metadata.path,
            size: result.metadata.size,
            contentType: result.metadata.contentType,
            createdAt: result.metadata.createdAt.toISOString(),
            updatedAt: result.metadata.updatedAt.toISOString(),
            customMetadata: result.metadata.customMetadata,
          },
        };

        if (validatedArgs.local_file_path) {
          response.savedTo = validatedArgs.local_file_path;
          response.message = `File downloaded and saved to ${validatedArgs.local_file_path}`;
        }

        if (shouldIncludeContent) {
          // For binary content, indicate it's binary
          if (Buffer.isBuffer(result.content)) {
            response.content = `[Binary content - ${result.metadata.size} bytes]`;
            response.isBinary = true;
          } else {
            response.content = result.content;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
