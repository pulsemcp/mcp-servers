import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { IStorageClient } from '../storage-client/types.js';

// =============================================================================
// PARAMETER DESCRIPTIONS
// =============================================================================

const PARAM_DESCRIPTIONS = {
  path:
    'The path/key of the file to delete from the bucket. ' +
    'This is a permanent deletion and cannot be undone. ' +
    'Examples: "documents/old-report.pdf", "temp/cache.json"',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const DeleteFileSchema = z.object({
  path: z.string().min(1).describe(PARAM_DESCRIPTIONS.path),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Delete a file from cloud storage.

Permanently removes a file from the cloud storage bucket. This operation cannot be undone.

**Parameters:**
- \`path\` (required): The file path in the bucket to delete

**Returns:**
JSON object confirming the deletion with the deleted file path.

**Use cases:**
- Remove temporary or outdated files
- Clean up after processing is complete
- Delete files that are no longer needed

**Warning:** This is a permanent operation. The file cannot be recovered after deletion unless bucket versioning is enabled.`;

// =============================================================================
// TOOL FACTORY
// =============================================================================

export function deleteFileTool(_server: Server, clientFactory: () => IStorageClient) {
  return {
    name: 'delete_file',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.path,
        },
      },
      required: ['path'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DeleteFileSchema.parse(args);
        const client = clientFactory();

        await client.deleteFile(validatedArgs.path);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `File deleted successfully: ${validatedArgs.path}`,
                  deletedPath: validatedArgs.path,
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
              text: `Error deleting file: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
