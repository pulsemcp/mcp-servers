import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { IFlyIOClient } from '../fly-io-client/fly-io-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The name of the Fly.io app to update the image for.',
  image:
    'Optional: Specific Docker image to deploy (e.g., "registry.fly.io/my-app:v2"). If not specified, updates to the latest available version.',
} as const;

export const UpdateImageSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  image: z.string().optional().describe(PARAM_DESCRIPTIONS.image),
});

const TOOL_DESCRIPTION = `Update the Docker image for a Fly.io application.

Updates all machines in the app to use a new Docker image. This is equivalent to "fly image update".

**Parameters:**
- app_name: The app to update
- image (optional): Specific image to deploy. If not provided, updates to the latest version.

**Returns:**
- Updated image details (registry, repository, tag, digest, version)

**Use cases:**
- Deploy a new version of your application
- Rollback to a specific image version
- Update to the latest base image

**Note:** This operation may take a while as it updates all machines in the app.`;

export function updateImageTool(_server: Server, clientFactory: () => IFlyIOClient) {
  return {
    name: 'update_image',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        image: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.image,
        },
      },
      required: ['app_name'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = UpdateImageSchema.parse(args);
        const client = clientFactory();

        const image = await client.updateImage(validatedArgs.app_name, {
          image: validatedArgs.image,
        });

        const output = [
          'Image updated successfully!',
          '',
          `Registry: ${image.registry}`,
          `Repository: ${image.repository}`,
          `Tag: ${image.tag}`,
          `Digest: ${image.digest}`,
          `Version: ${image.version}`,
          '',
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
              text: `Error updating image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
