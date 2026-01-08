import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IGCSClient } from '../gcs-client/gcs-client.js';

// =============================================================================
// PARAMETER DESCRIPTIONS - Single Source of Truth
// =============================================================================

const PARAM_DESCRIPTIONS = {
  source:
    'The data source to upload. Can be either: ' +
    '1) A file:// URI pointing to a local file (e.g., "file:///tmp/screenshots/image.png"), or ' +
    '2) A base64-encoded string of the file contents. ' +
    'Use file:// URIs when uploading from MCP resources or local files.',
  path:
    'Destination path in the remote filesystem (relative to root). ' +
    'If not provided, a timestamp-based filename will be generated. ' +
    'Example: "screenshots/pr-123.png" or "reports/2024/summary.pdf"',
  contentType:
    'Optional MIME type for the file. If not provided, will be inferred from the path extension. ' +
    'Common types: "image/png", "image/jpeg", "application/pdf", "text/plain"',
  makePublic:
    'Whether to make the file publicly accessible. ' +
    'If not specified, uses the server default (GCS_MAKE_PUBLIC env var).',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const UploadSchema = z.object({
  source: z.string().min(1).describe(PARAM_DESCRIPTIONS.source),
  path: z.string().optional().describe(PARAM_DESCRIPTIONS.path),
  contentType: z.string().optional().describe(PARAM_DESCRIPTIONS.contentType),
  makePublic: z.boolean().optional().describe(PARAM_DESCRIPTIONS.makePublic),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Upload a file to the remote filesystem.

This tool accepts either a file:// URI pointing to a local file, or base64-encoded file contents. It uploads the data to the configured storage and returns file info including a URL.

**Input formats:**
- \`file://\` URI: Points to a local file (e.g., from MCP resources)
- Base64 string: Raw file contents encoded in base64

**Returns:**
- \`path\`: Path in the remote filesystem
- \`url\`: URL to access the file (public or signed)
- \`size\`: File size in bytes
- \`contentType\`: MIME type of the file
- \`isPublic\`: Whether the file is publicly accessible

**Use cases:**
- Upload screenshots to share in PRs
- Upload generated reports or documents
- Store files for later retrieval

**Example:**
\`\`\`
upload({
  source: "file:///tmp/screenshots/page.png",
  path: "screenshots/pr-123.png",
  makePublic: true
})
\`\`\``;

/**
 * Factory function for creating the upload tool
 */
export function uploadTool(_server: Server, clientFactory: () => IGCSClient) {
  return {
    name: 'upload',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.source,
        },
        path: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.path,
        },
        contentType: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.contentType,
        },
        makePublic: {
          type: 'boolean',
          description: PARAM_DESCRIPTIONS.makePublic,
        },
      },
      required: ['source'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UploadSchema.parse(args);
        const { source, path, contentType, makePublic } = validatedArgs;

        const client = clientFactory();

        let result;

        if (source.startsWith('file://')) {
          // Handle file:// URI - read from local filesystem
          const filePath = source.replace('file://', '');
          result = await client.uploadFile(filePath, {
            path,
            contentType,
            makePublic,
          });
        } else {
          // Assume base64-encoded data
          result = await client.upload(source, {
            path,
            contentType,
            makePublic,
          });
        }

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
              text: `Error uploading file: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
