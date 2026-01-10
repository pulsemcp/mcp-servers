import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name:
    'The name for the new app. Must be unique across all of Fly.io. Use lowercase letters, numbers, and hyphens.',
  org_slug:
    'The organization slug where the app will be created. Use "personal" for your personal organization.',
  network: 'Optional custom IPv6 private network name for the app.',
} as const;

export const CreateAppSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  org_slug: z.string().min(1).describe(PARAM_DESCRIPTIONS.org_slug),
  network: z.string().optional().describe(PARAM_DESCRIPTIONS.network),
});

const TOOL_DESCRIPTION = `Create a new Fly.io application.

Creates an empty app that can then have machines deployed to it.

**Returns:**
- Created app ID and name
- Organization info
- Initial status

**Use cases:**
- Set up a new application before deploying machines
- Create apps in specific organizations
- Initialize app with custom network settings

**Note:** App names must be globally unique across all of Fly.io.`;

export function createAppTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'create_app',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        org_slug: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.org_slug,
        },
        network: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.network,
        },
      },
      required: ['app_name', 'org_slug'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CreateAppSchema.parse(args);
        const client = clientFactory();

        const app = await client.createApp({
          app_name: validatedArgs.app_name,
          org_slug: validatedArgs.org_slug,
          network: validatedArgs.network,
        });

        return {
          content: [
            {
              type: 'text',
              text: `Successfully created app "${app.name}" (ID: ${app.id}) in organization "${validatedArgs.org_slug}".`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error creating app: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
