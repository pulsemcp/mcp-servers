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

const TOOL_DESCRIPTION = `Push a local Docker image to Fly.io's private registry (registry.fly.io).

This tool uploads a Docker image from your local machine to Fly.io's registry, making it available
to run on Fly machines. After pushing, you can use the image reference with create_machine or
update_machine to deploy containers.

**Fly Registry:**
- Images are stored at registry.fly.io/<app_name>:<tag>
- Only accessible by your Fly.io account
- Automatically authenticated via your Fly API token

**Parameters:**
- source_image: Local Docker image to push (must exist in local Docker)
- app_name: Fly app name (determines the registry path)
- tag: Tag for the pushed image

**Returns:**
- Full registry path for use with Fly machines
- Image digest (SHA256) for verification

**Workflow:**
1. Build your Docker image locally
2. Push to Fly registry with this tool
3. Use the returned image reference with create_machine or update_machine

**Note:** Requires Docker CLI to be installed and running locally.`;

export function pushImageTool(_server: Server, dockerClientFactory: () => DockerCLIClient) {
  return {
    name: 'push_new_fly_registry_image',
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
