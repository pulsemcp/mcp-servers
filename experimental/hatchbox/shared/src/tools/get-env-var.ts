import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  name: 'The name of the environment variable to retrieve (e.g., "RAILS_ENV", "DATABASE_URL", "SECRET_KEY_BASE")',
} as const;

const GetEnvVarSchema = z.object({
  name: z.string().describe(PARAM_DESCRIPTIONS.name),
});

export function getEnvVarTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'getEnvVar',
    description: `Retrieve a specific environment variable from your Rails application running on Hatchbox via SSH. This tool connects to your server and reads the requested environment variable directly from the running puma process.

Example response:
RAILS_ENV=production

Or if not found:
Environment variable 'NONEXISTENT_VAR' not found

Use cases:
- Checking the current Rails environment (RAILS_ENV)
- Verifying database connection strings without exposing all credentials
- Confirming API keys are properly set
- Debugging specific configuration values
- Validating environment-specific settings after deployment

Note: Requires WEB_SERVER_IP_ADDRESS to be configured`,
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: PARAM_DESCRIPTIONS.name,
        },
      },
      required: ['name'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = GetEnvVarSchema.parse(args);
      const client = clientFactory();

      if (!client.getEnvVar) {
        return {
          content: [
            {
              type: 'text',
              text: 'Reading environment variables requires WEB_SERVER_IP_ADDRESS to be configured',
            },
          ],
          isError: true,
        };
      }

      try {
        const envVar = await client.getEnvVar(validatedArgs.name);

        if (envVar) {
          return {
            content: [
              {
                type: 'text',
                text: `${envVar.name}=${envVar.value}`,
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: `Environment variable '${validatedArgs.name}' not found`,
              },
            ],
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving environment variable: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
