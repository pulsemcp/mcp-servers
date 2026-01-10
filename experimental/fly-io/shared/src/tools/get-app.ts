import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the Fly.io app to retrieve details for.',
} as const;

export const GetAppSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
});

const TOOL_DESCRIPTION = `Get details for a specific Fly.io application.

Returns detailed information about an app including its status, organization, and configuration.

**Returns:**
- App ID and name
- Current status
- Organization details
- Network configuration

**Use cases:**
- Check the status of a specific app
- Get app details before deploying machines
- Verify app configuration`;

export function getAppTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'get_app',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
      },
      required: ['app_name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetAppSchema.parse(args);
        const client = clientFactory();

        const app = await client.getApp(validatedArgs.app_name);

        const output = [
          `App: ${app.name}`,
          `ID: ${app.id}`,
          `Status: ${app.status}`,
          `Organization: ${app.organization?.name || 'unknown'} (${app.organization?.slug || 'unknown'})`,
          app.machine_count !== undefined ? `Machines: ${app.machine_count}` : null,
          app.network ? `Network: ${app.network}` : null,
        ]
          .filter(Boolean)
          .join('\n');

        return {
          content: [
            {
              type: 'text',
              text: output,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error getting app: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
