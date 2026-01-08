import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IGCSClient } from '../gcs-client/gcs-client.js';

// =============================================================================
// PARAMETER DESCRIPTIONS - Single Source of Truth
// =============================================================================

const PARAM_DESCRIPTIONS = {
  path: 'Path to the file in the remote filesystem (relative to root). Example: "screenshots/pr-123.png"',
  asBase64:
    'If true, return the file contents as a base64-encoded string. ' +
    'Useful for binary files like images. Default: false (returns as text).',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const DownloadSchema = z.object({
  path: z.string().min(1).describe(PARAM_DESCRIPTIONS.path),
  asBase64: z.boolean().optional().describe(PARAM_DESCRIPTIONS.asBase64),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Download a file from the remote filesystem.

Retrieves the contents of a file from the remote storage. Can return the content as text (default) or base64-encoded for binary files.

**Parameters:**
- \`path\`: Path to the file (relative to root)
- \`asBase64\`: Return as base64 string (useful for images/binary files)

**Returns:**
- \`content\`: The file contents (text or base64)
- \`info\`: File metadata (path, size, contentType, etc.)

**Use cases:**
- Retrieve previously uploaded files
- Download configuration files
- Get file contents for processing

**Example:**
\`\`\`
download({
  path: "config/settings.json"
})
\`\`\`

For binary files like images:
\`\`\`
download({
  path: "screenshots/page.png",
  asBase64: true
})
\`\`\``;

/**
 * Factory function for creating the download tool
 */
export function downloadTool(_server: Server, clientFactory: () => IGCSClient) {
  return {
    name: 'download',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.path,
        },
        asBase64: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.asBase64,
        },
      },
      required: ['path'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = DownloadSchema.parse(args);
        const { path, asBase64 } = validatedArgs;

        const client = clientFactory();
        const result = await client.download(path, { asBase64 });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  content: result.content,
                  info: result.info,
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
              text: `Error downloading file: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
