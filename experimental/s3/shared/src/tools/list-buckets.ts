import { z } from 'zod';
import type { Server } from '@modelcontextprotocol/sdk/server/index.js';
import type { S3ClientFactory } from '../server.js';

export const ListBucketsSchema = z.object({});

export function listBucketsTool(_server: Server, clientFactory: S3ClientFactory) {
  return {
    name: 'list_buckets',
    description: `List all S3 buckets in the AWS account.

Returns a list of bucket names and their creation dates.

Example response:
{
  "buckets": [
    {"name": "my-app-data", "creationDate": "2024-01-15T10:30:00Z"},
    {"name": "logs-archive", "creationDate": "2024-02-20T14:45:00Z"}
  ]
}

Use cases:
- Discover available buckets in the account
- Audit bucket inventory
- Find bucket names for subsequent operations`,
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [] as string[],
    },
    handler: async (_args: unknown) => {
      try {
        const client = clientFactory();
        const result = await client.listBuckets();

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
          content: [{ type: 'text', text: `Error listing buckets: ${message}` }],
          isError: true,
        };
      }
    },
  };
}
