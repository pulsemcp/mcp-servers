import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IGCSClient } from '../gcs-client/gcs-client.js';

// =============================================================================
// PARAMETER DESCRIPTIONS - Single Source of Truth
// =============================================================================

const PARAM_DESCRIPTIONS = {
  path: 'Path to the file to delete (relative to root). Example: "screenshots/old-image.png"',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const DeleteSchema = z.object({
  path: z.string().min(1).describe(PARAM_DESCRIPTIONS.path),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Delete a file from the remote filesystem.

Permanently removes a file from the remote storage. This action cannot be undone.

**Parameters:**
- \`path\`: Path to the file to delete (required)

**Returns:**
- Success confirmation with the deleted file path

**Use cases:**
- Remove old or unused files
- Clean up temporary uploads
- Delete files that are no longer needed

**Example:**
\`\`\`
delete_file({
  path: "temp/upload-2024-01-01.png"
})
\`\`\``;

/**
 * Factory function for creating the delete_file tool
 */
export function deleteFileTool(_server: Server, clientFactory: () => IGCSClient) {
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
        const validatedArgs = DeleteSchema.parse(args);
        const { path } = validatedArgs;

        const client = clientFactory();
        await client.delete(path);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: true,
                  message: `File deleted: ${path}`,
                  path,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting file: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
