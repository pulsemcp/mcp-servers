import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { DockerCLIClient } from '../docker-client/docker-cli-client.js';

const PARAM_DESCRIPTIONS = {
  source_image:
    'The local Docker image to push (e.g., "my-app:latest", "nginx:1.25", or a full image reference).',
  app_name: 'The Fly.io app name. The image will be pushed to registry.fly.io/<app_name>:<tag>.',
  tag: 'The tag for the pushed image (e.g., "v1", "latest", "deployment-123").',
} as const;

export const PushImageSchema = z.object({
  source_image: z.string().min(1).describe(PARAM_DESCRIPTIONS.source_image),
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  tag: z.string().min(1).describe(PARAM_DESCRIPTIONS.tag),
});

const TOOL_DESCRIPTION = `Push a local Docker image to Fly.io's registry.

Takes a local Docker image and pushes it to registry.fly.io for use with Fly machines.

**Parameters:**
- source_image: Local image to push (must exist locally)
- app_name: Fly app name (determines the registry path)
- tag: Tag for the pushed image

**Returns:**
- Registry path (registry.fly.io/<app_name>:<tag>)
- Image digest (SHA256)

**Use cases:**
- Deploy a locally built image to Fly.io
- Push a tagged version of an external image
- Prepare an image for machine deployment

**Note:** Requires Docker CLI to be installed and running.`;

export function pushImageTool(_server: Server, dockerClientFactory: () => DockerCLIClient) {
  return {
    name: 'push_image',
    description: TOOL_DESCRIPTION,
    inputSchema: {
      type: 'object' as const,
      properties: {
        source_image: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.source_image,
        },
        app_name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.app_name,
        },
        tag: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.tag,
        },
      },
      required: ['source_image', 'app_name', 'tag'],
    },
    handler: async (args: unknown) => {
      try {
        const validatedArgs = PushImageSchema.parse(args);
        const client = dockerClientFactory();

        const result = await client.pushImage(
          validatedArgs.source_image,
          validatedArgs.app_name,
          validatedArgs.tag
        );

        const output = [
          'Image pushed successfully!',
          '',
          `Registry: ${result.registry}`,
          `Repository: ${result.repository}`,
          `Tag: ${result.tag}`,
          result.digest ? `Digest: ${result.digest}` : null,
          '',
          `Full reference: ${result.registry}/${result.repository}:${result.tag}`,
          '',
          'You can now use this image with create_machine or update_machine.',
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
              text: `Error pushing image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
