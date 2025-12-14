import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IStorageClient } from '../storage-client/types.js';
import { readFileSync, existsSync } from 'fs';

// =============================================================================
// PARAMETER DESCRIPTIONS
// =============================================================================

const PARAM_DESCRIPTIONS = {
  path:
    'The path/key where the file will be stored in the bucket. ' +
    'Use forward slashes for directory-like organization. ' +
    'Examples: "documents/report.pdf", "data/config.json", "images/logo.png"',
  content:
    'The file content to save. Provide this for text-based files. ' +
    'For binary files, use local_file_path instead.',
  local_file_path:
    'Path to a local file to upload. Use this for binary files ' +
    'or when you want to reference an existing file instead of providing inline content. ' +
    'Example: "/tmp/report.pdf"',
  content_type:
    'MIME type for the file. Auto-detected from file extension if not provided. ' +
    'Examples: "application/json", "text/plain", "image/png"',
  metadata:
    'Custom metadata key-value pairs to store with the file. ' +
    'Useful for tagging, categorization, or storing additional context. ' +
    'Example: {"author": "Claude", "version": "1.0"}',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const SaveFileSchema = z
  .object({
    path: z.string().min(1).describe(PARAM_DESCRIPTIONS.path),
    content: z.string().optional().describe(PARAM_DESCRIPTIONS.content),
    local_file_path: z.string().optional().describe(PARAM_DESCRIPTIONS.local_file_path),
    content_type: z.string().optional().describe(PARAM_DESCRIPTIONS.content_type),
    metadata: z.record(z.string()).optional().describe(PARAM_DESCRIPTIONS.metadata),
  })
  .refine((data) => data.content !== undefined || data.local_file_path !== undefined, {
    message: 'Either content or local_file_path must be provided',
  });

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Save a file to cloud storage.

Uploads content to the specified path in the cloud storage bucket. You can either provide the content inline or reference a local file path.

**Parameters:**
- \`path\` (required): The destination path in the bucket
- \`content\`: Inline text content to save (for text files)
- \`local_file_path\`: Path to a local file to upload (for binary files or when avoiding inline content)
- \`content_type\`: MIME type (auto-detected if not provided)
- \`metadata\`: Custom key-value metadata to attach to the file

**Returns:**
JSON object with the saved file's metadata including path, size, content type, and timestamps.

**Use cases:**
- Save configuration files, documents, or data exports to cloud storage
- Upload binary files (images, PDFs) using local_file_path to preserve context window
- Store generated content with custom metadata for organization

**Note:** Either \`content\` or \`local_file_path\` must be provided, but not both.`;

// =============================================================================
// TOOL FACTORY
// =============================================================================

export function saveFileTool(_server: Server, clientFactory: () => IStorageClient) {
  return {
    name: 'save_file',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.path,
        },
        content: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.content,
        },
        local_file_path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.local_file_path,
        },
        content_type: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.content_type,
        },
        metadata: {
          type: 'object',
          additionalProperties: { type: 'string' },
          description: PARAM_DESCRIPTIONS.metadata,
        },
      },
      required: ['path'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = SaveFileSchema.parse(args);
        const client = clientFactory();

        let fileContent: string | Buffer;

        if (validatedArgs.local_file_path) {
          // Read from local file
          if (!existsSync(validatedArgs.local_file_path)) {
            throw new Error(`Local file not found: ${validatedArgs.local_file_path}`);
          }
          fileContent = readFileSync(validatedArgs.local_file_path);
        } else if (validatedArgs.content !== undefined) {
          fileContent = validatedArgs.content;
        } else {
          throw new Error('Either content or local_file_path must be provided');
        }

        const metadata = await client.saveFile(validatedArgs.path, fileContent, {
          contentType: validatedArgs.content_type,
          customMetadata: validatedArgs.metadata,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `File saved successfully to ${validatedArgs.path}`,
                  file: {
                    path: metadata.path,
                    size: metadata.size,
                    contentType: metadata.contentType,
                    createdAt: metadata.createdAt.toISOString(),
                    updatedAt: metadata.updatedAt.toISOString(),
                    customMetadata: metadata.customMetadata,
                  },
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error saving file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
