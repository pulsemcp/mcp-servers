import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { S3ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  bucket: 'The name of the S3 bucket (e.g., "my-app-data")',
  key: 'The object key (path) within the bucket (e.g., "logs/2024/01/data.json")',
} as const;

export const GetObjectSchema = z.object({
  bucket: z.string().min(1).describe(PARAM_DESCRIPTIONS.bucket),
  key: z.string().min(1).describe(PARAM_DESCRIPTIONS.key),
});

export function getObjectTool(_server: Server, clientFactory: S3ClientFactory) {
  return {
    name: 's3_get_object',
    description: `Get the contents of an object from S3.

Returns the object content as text along with metadata.

Example response:
{
  "content": "{\\"name\\": \\"example\\", \\"value\\": 123}",
  "contentType": "application/json",
  "contentLength": 35,
  "lastModified": "2024-03-01T10:00:00Z",
  "etag": "\\"abc123\\"",
  "metadata": {"custom-key": "custom-value"}
}

Use cases:
- Read configuration files
- Retrieve JSON data
- Download text files
- Access log files

Note: This tool reads objects as UTF-8 text. Binary files may not display correctly.`,
    inputSchema: {
      type: 'object' as const,
      properties: {
        bucket: { type: 'string', description: PARAM_DESCRIPTIONS.bucket },
        key: { type: 'string', description: PARAM_DESCRIPTIONS.key },
      },
      required: ['bucket', 'key'],
    },
    handler: async (args: unknown) => {
      try {
        const validated = GetObjectSchema.parse(args);
        const client = clientFactory();
        const result = await client.getObject(validated.bucket, validated.key);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `Error getting object: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
