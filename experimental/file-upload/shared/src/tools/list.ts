import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IGCSClient } from '../gcs-client/gcs-client.js';

// =============================================================================
// PARAMETER DESCRIPTIONS - Single Source of Truth
// =============================================================================

const PARAM_DESCRIPTIONS = {
  prefix:
    'Directory path to list (relative to root). If not provided, lists the root directory. ' +
    'Example: "screenshots" or "reports/2024"',
  maxResults: 'Maximum number of files to return. Default: 100.',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const ListSchema = z.object({
  prefix: z.string().optional().describe(PARAM_DESCRIPTIONS.prefix),
  maxResults: z.number().optional().describe(PARAM_DESCRIPTIONS.maxResults),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `List files and directories in the remote filesystem.

Lists all files and subdirectories at the specified path. Returns file metadata including size, content type, and URLs.

**Parameters:**
- \`prefix\`: Directory path to list (optional, defaults to root)
- \`maxResults\`: Maximum number of files to return (optional)

**Returns:**
- \`files\`: Array of file info objects with path, size, contentType, url, etc.
- \`directories\`: Array of subdirectory paths

**Use cases:**
- Browse the remote filesystem
- Find files matching a pattern
- Check what files exist in a directory

**Example:**
\`\`\`
list_files({
  prefix: "screenshots"
})
\`\`\`

List root directory:
\`\`\`
list_files({})
\`\`\``;

/**
 * Factory function for creating the list_files tool
 */
export function listFilesTool(_server: Server, clientFactory: () => IGCSClient) {
  return {
    name: 'list_files',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        prefix: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.prefix,
        },
        maxResults: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.maxResults,
        },
      },
      required: [],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListSchema.parse(args);
        const { prefix, maxResults } = validatedArgs;

        const client = clientFactory();
        const result = await client.list({ prefix, maxResults });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return {
          content: [
            {
              type: 'text',
              text: `Error listing files: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
