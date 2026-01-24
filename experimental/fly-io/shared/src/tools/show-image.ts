import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the Fly.io app to show image details for.',
} as const;

export const ShowImageSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
});

const TOOL_DESCRIPTION = `Show the current Docker image details for a Fly.io application.

Returns information about the Docker image currently deployed to the app.

**Returns:**
- Registry and repository
- Image tag
- Digest (SHA256)
- Version number

**Use cases:**
- Check which image version is deployed
- Get the image digest for verification
- Verify deployment status`;

export function showImageTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'show_image',
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
        const validatedArgs = ShowImageSchema.parse(args);
        const client = clientFactory();

        const image = await client.showImage(validatedArgs.app_name);

        const output = [
          `Registry: ${image.registry}`,
          `Repository: ${image.repository}`,
          `Tag: ${image.tag}`,
          `Digest: ${image.digest}`,
          `Version: ${image.version}`,
          ``,
          `Full reference: ${image.registry}/${image.repository}:${image.tag}`,
        ].join('\n');

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
              text: `Error showing image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
