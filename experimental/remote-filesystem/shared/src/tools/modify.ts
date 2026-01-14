import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IGCSClient } from '../gcs-client/gcs-client.js';

// =============================================================================
// PARAMETER DESCRIPTIONS - Single Source of Truth
// =============================================================================

const PARAM_DESCRIPTIONS = {
  path: 'Path to the file in the remote filesystem (relative to root). Example: "screenshots/pr-123.png"',
  makePublic: 'Make the file publicly accessible via URL.',
  makePrivate: 'Make the file private (requires signed URL to access).',
  contentType: 'Change the MIME type of the file. Example: "image/png", "application/pdf"',
  metadata: 'Custom metadata key-value pairs to set on the file.',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const ModifySchema = z.object({
  path: z.string().min(1).describe(PARAM_DESCRIPTIONS.path),
  makePublic: z.boolean().optional().describe(PARAM_DESCRIPTIONS.makePublic),
  makePrivate: z.boolean().optional().describe(PARAM_DESCRIPTIONS.makePrivate),
  contentType: z.string().optional().describe(PARAM_DESCRIPTIONS.contentType),
  metadata: z.record(z.string()).optional().describe(PARAM_DESCRIPTIONS.metadata),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Modify file properties in the remote filesystem.

Change file access permissions (public/private), content type, or custom metadata.

**Parameters:**
- \`path\`: Path to the file (required)
- \`makePublic\`: Make the file publicly accessible
- \`makePrivate\`: Make the file private
- \`contentType\`: Change the MIME type
- \`metadata\`: Custom metadata key-value pairs

**Returns:**
Updated file info with new properties.

**Use cases:**
- Make a file publicly accessible for sharing
- Make a file private after sharing
- Update content type if incorrectly detected
- Add custom metadata for tracking

**Example - Make public:**
\`\`\`
modify({
  path: "screenshots/pr-123.png",
  makePublic: true
})
\`\`\`

**Example - Make private:**
\`\`\`
modify({
  path: "reports/confidential.pdf",
  makePrivate: true
})
\`\`\`

**Example - Update metadata:**
\`\`\`
modify({
  path: "docs/readme.md",
  contentType: "text/markdown",
  metadata: { "author": "claude", "version": "1.0" }
})
\`\`\``;

/**
 * Factory function for creating the modify tool
 */
export function modifyTool(_server: Server, clientFactory: () => IGCSClient) {
  return {
    name: 'modify',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.path,
        },
        makePublic: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.makePublic,
        },
        makePrivate: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.makePrivate,
        },
        contentType: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.contentType,
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
        const validatedArgs = ModifySchema.parse(args);
        const { path, makePublic, makePrivate, contentType, metadata } = validatedArgs;

        // Validate that both makePublic and makePrivate aren't set
        if (makePublic && makePrivate) {
          return {
            content: [
              {
                type: 'text',
                text: 'Error: Cannot set both makePublic and makePrivate to true',
              },
            ],
            isError: true,
          };
        }

        const client = clientFactory();
        const result = await client.modify(path, {
          makePublic,
          makePrivate,
          contentType,
          metadata,
        });

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
              text: `Error modifying file: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
