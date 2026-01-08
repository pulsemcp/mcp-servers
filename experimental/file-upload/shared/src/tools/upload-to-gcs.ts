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
  filename:
    'Optional custom filename for the uploaded file (without path). ' +
    'If not provided, a timestamp-based filename will be generated. ' +
    'Example: "screenshot-2024-01-15.png"',
  contentType:
    'Optional MIME type for the file. If not provided, will be inferred from the filename extension. ' +
    'Common types: "image/png", "image/jpeg", "application/pdf", "text/plain"',
} as const;

// =============================================================================
// SCHEMA DEFINITION
// =============================================================================

export const UploadToGCSSchema = z.object({
  source: z.string().min(1).describe(PARAM_DESCRIPTIONS.source),
  filename: z.string().optional().describe(PARAM_DESCRIPTIONS.filename),
  contentType: z.string().optional().describe(PARAM_DESCRIPTIONS.contentType),
});

// =============================================================================
// TOOL DESCRIPTION
// =============================================================================

const TOOL_DESCRIPTION = `Upload a file to Google Cloud Storage and get a public URL.

This tool accepts either a file:// URI pointing to a local file, or base64-encoded file contents. It uploads the data to the configured GCS bucket and returns a public URL.

**Input formats:**
- \`file://\` URI: Points to a local file (e.g., from MCP resources)
- Base64 string: Raw file contents encoded in base64

**Returns:**
- \`url\`: Public URL to access the uploaded file
- \`bucket\`: GCS bucket name
- \`path\`: Full path within the bucket
- \`size\`: File size in bytes
- \`contentType\`: MIME type of the file

**Use cases:**
- Upload screenshots from playwright-stealth to share in PRs
- Upload generated reports or documents to cloud storage
- Make local files accessible via URL

**Example:**
\`\`\`
upload_to_gcs({
  source: "file:///tmp/playwright-screenshots/page-1736300000000.png",
  filename: "pr-screenshot.png"
})
\`\`\``;

/**
 * Factory function for creating the upload_to_gcs tool
 */
export function uploadToGCSTool(_server: Server, clientFactory: () => IGCSClient) {
  return {
    name: 'upload_to_gcs',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        source: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.source,
        },
        filename: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.filename,
        },
        contentType: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.contentType,
        },
      },
      required: ['source'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UploadToGCSSchema.parse(args);
        const { source, filename, contentType } = validatedArgs;

        const client = clientFactory();

        let result;

        if (source.startsWith('file://')) {
          // Handle file:// URI - read from local filesystem
          const filePath = source.replace('file://', '');
          result = await client.uploadFile(filePath, {
            filename,
            contentType,
          });
        } else {
          // Assume base64-encoded data
          result = await client.upload(source, {
            filename,
            contentType,
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  url: result.url,
                  bucket: result.bucket,
                  path: result.path,
                  size: result.size,
                  contentType: result.contentType,
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
              text: `Error uploading to GCS: ${message}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
