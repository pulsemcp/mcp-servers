import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  org_slug:
    'Optional organization slug to filter apps. If not provided, lists apps from all organizations you have access to.',
} as const;

export const ListAppsSchema = z.object({
  org_slug: z.string().optional().describe(PARAM_DESCRIPTIONS.org_slug),
});

const TOOL_DESCRIPTION = `List all Fly.io applications you have access to.

Returns a list of apps with their names, IDs, status, and organization info.

**Returns:**
- App name and ID
- Current status (deployed, suspended, etc.)
- Organization name and slug
- Machine count

**Use cases:**
- Get an overview of all your deployed applications
- Find an app name for use with other tools
- Check app statuses across organizations`;

export function listAppsTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'list_apps',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        org_slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.org_slug,
        },
      },
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = ListAppsSchema.parse(args);
        const client = clientFactory();

        const apps = await client.listApps(validatedArgs.org_slug);

        if (apps.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No apps found.',
              },
            ],
          };
        }

        const output = apps
          .map(
            (app) =>
              `- ${app.name} (${app.id})\n  Status: ${app.status}\n  Org: ${app.organization?.slug || 'unknown'}\n  Machines: ${app.machine_count || 0}`
          )
          .join('\n\n');

        return {
          content: [
            {
              type: 'text',
              text: `Found ${apps.length} app(s):\n\n${output}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error listing apps: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
