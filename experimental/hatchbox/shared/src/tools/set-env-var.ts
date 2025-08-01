import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  name: 'The environment variable name (e.g., "FEATURE_FLAG_ENABLED", "API_ENDPOINT", "CACHE_TTL")',
  value:
    'The value to set for the environment variable. Can be strings, numbers, URLs, or any text value',
} as const;

const SetEnvVarSchema = z.object({
  name: z.string().describe(PARAM_DESCRIPTIONS.name),
  value: z.string().describe(PARAM_DESCRIPTIONS.value),
});

export function setEnvVarTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'setEnvVar',
    description: `Set or update an environment variable for your Rails application on Hatchbox. This tool uses the Hatchbox API to modify environment variables, which will be applied on the next deployment. Changes do not take effect immediately - you must trigger a deployment after setting variables.

Example response:
Successfully set environment variable: FEATURE_FLAG_ENABLED=true

Use cases:
- Enabling or disabling feature flags
- Updating API endpoints or external service URLs
- Changing application configuration values
- Setting new API keys or credentials
- Adjusting performance tuning parameters
- Configuring third-party service integrations

Important notes:
- Changes require a deployment to take effect
- Use getEnvVars to verify current values before changes
- Requires READONLY=false in configuration
- Some variables like RAILS_ENV should be changed with caution`,
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.name,
        },
        value: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.value,
        },
      },
      required: ['name', 'value'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = SetEnvVarSchema.parse(args);
      const client = clientFactory();

      try {
        await client.setEnvVar(validatedArgs.name, validatedArgs.value);

        // Since we can't retrieve env vars to check if it was an update or create,
        // we'll just say "set" which covers both cases
        return {
          content: [
            {
              type: 'text',
              text: `Successfully set environment variable: ${validatedArgs.name}=${validatedArgs.value}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error setting environment variable: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
