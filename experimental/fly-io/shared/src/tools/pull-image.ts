import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import type { DockerCLIClient } from '../docker-client/docker-cli-client.js';

const PARAM_DESCRIPTIONS = {
  app_name: 'The Fly.io app name to pull the image from.',
  tag: 'The image tag to pull (e.g., "latest", "v1", "deployment-123").',
} as const;

export const PullImageSchema = z.object({
  app_name: z.string().min(1).describe(PARAM_DESCRIPTIONS.app_name),
  tag: z.string().min(1).describe(PARAM_DESCRIPTIONS.tag),
});

const TOOL_DESCRIPTION = `Pull an image from Fly.io's private registry (registry.fly.io) to local Docker.

Downloads an image that was previously pushed to the Fly.io registry to your local Docker daemon.
This is useful for inspecting images currently running on Fly machines or debugging deployments.

**Fly Registry:**
- Images are stored at registry.fly.io/<app_name>:<tag>
- Only accessible by your Fly.io account
- Automatically authenticated via your Fly API token

**Parameters:**
- app_name: Fly app name (the image repository)
- tag: Image tag to pull

**Returns:**
- Confirmation of successful pull
- Full image reference for local use

**Use cases:**
- Inspect an image currently running on Fly machines
- Debug issues by examining the deployed image locally
- Use a Fly registry image as a base for new builds
- Verify image contents before or after deployment

**Note:** Requires Docker CLI to be installed and running locally.`;

export function pullImageTool(_server: Server, dockerClientFactory: () => DockerCLIClient) {
  return {
    name: 'pull_fly_registry_image',
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
        const validatedArgs = PullImageSchema.parse(args);
        const client = dockerClientFactory();

        const result = await client.pullImage(validatedArgs.app_name, validatedArgs.tag);

        const output = [
          'Image pulled successfully!',
          '',
          `Registry: ${result.registry}`,
          `Repository: ${result.repository}`,
          `Tag: ${result.tag}`,
          '',
          `Full reference: ${result.registry}/${result.repository}:${result.tag}`,
          '',
          'The image is now available locally in Docker.',
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
              text: `Error pulling image: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
