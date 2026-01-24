import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { DockerCLIClient } from '../docker-client/docker-cli-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The Fly.io app name to check.',
  tag: 'The image tag to check for (e.g., "latest", "v1", "deployment-123").',
} as const;

export const CheckRegistryImageSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  tag: z.string().min(1).describe(PARAM_DESCRIPTIONS.tag),
});

const TOOL_DESCRIPTION = `Check if an image exists in Fly.io's registry.

Verifies whether a specific image tag exists in the Fly.io registry for an app.

**Parameters:**
- app_name: Fly app name
- tag: Image tag to check

**Returns:**
- Whether the image exists
- Full image reference if it exists

**Use cases:**
- Verify an image was pushed successfully
- Check if a specific version is available
- Validate image references before deployment

**Note:** Requires Docker CLI to be installed and running.`;

export function checkRegistryImageTool(
  _server: Server,
  dockerClientFactory: () => DockerCLIClient
) {
  return {
    name: 'check_registry_image',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        tag: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tag,
        },
      },
      required: ['app_name', 'tag'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = CheckRegistryImageSchema.parse(args);
        const client = dockerClientFactory();

        const exists = await client.imageExists(validatedArgs.app_name, validatedArgs.tag);
        const imageRef = `registry.fly.io/${validatedArgs.app_name}:${validatedArgs.tag}`;

        if (exists) {
          return {
            content: [
              {
                type: 'text',
                text: [
                  '✓ Image exists in Fly.io registry',
                  '',
                  `Image: ${imageRef}`,
                  '',
                  'This image can be used with create_machine or update_machine.',
                ].join('\n'),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: [
                  '✗ Image not found in Fly.io registry',
                  '',
                  `Checked: ${imageRef}`,
                  '',
                  'The image either does not exist or you do not have access to it.',
                  'Use push_image to push a local image to the registry.',
                ].join('\n'),
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error checking image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
