import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the Fly.io app to list releases for.',
  limit: 'Optional: Maximum number of releases to return (default: all).',
} as const;

export const ListReleasesSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  limit: z.number().int().positive().optional().describe(PARAM_DESCRIPTIONS.limit),
});

const TOOL_DESCRIPTION = `List releases for a Fly.io application with their Docker image references.

Returns a list of releases showing deployment history and image versions.

**Returns:**
- Release version and ID
- Status (stable, in-progress)
- Description and reason
- User who created the release
- Docker image reference for each release
- Creation timestamp

**Use cases:**
- View deployment history
- Track image versions across releases
- Debug deployment issues
- Identify who deployed what`;

export function listReleasesTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'list_releases',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        limit: {
          type: 'number',
          description: PARAM_DESCRIPTIONS.limit,
        },
      },
      required: ['app_name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListReleasesSchema.parse(args);
        const client = clientFactory();

        const releases = await client.listReleases(validatedArgs.app_name, {
          limit: validatedArgs.limit,
        });

        if (releases.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No releases found for this app.',
              },
            ],
          };
        }

        const output = releases
          .map((r) => {
            const lines = [
              `v${r.version} (${r.id})`,
              `  Status: ${r.status}${r.stable ? ' (stable)' : ''}${r.inProgress ? ' (in progress)' : ''}`,
              `  Description: ${r.description || 'N/A'}`,
              r.reason ? `  Reason: ${r.reason}` : null,
              `  User: ${r.user?.name || r.user?.email || 'unknown'}`,
              r.imageRef ? `  Image: ${r.imageRef}` : null,
              `  Created: ${r.createdAt}`,
            ];
            return lines.filter(Boolean).join('\n');
          })
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${releases.length} release(s):\n\n${output}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing releases: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
