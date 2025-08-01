import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { ClientFactory } from '../server.js';

const PARAM_DESCRIPTIONS = {
  names:
    'Array of environment variable names to delete (e.g., ["OLD_API_KEY", "DEPRECATED_FLAG", "TEMP_CONFIG"])',
} as const;

const DeleteEnvVarsSchema = z.object({
  names: z.array(z.string()).describe(PARAM_DESCRIPTIONS.names),
});

export function deleteEnvVarsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'deleteEnvVars',
    description: `Delete one or more environment variables from your Rails application on Hatchbox. This tool uses the Hatchbox API to remove environment variables, which will take effect on the next deployment. Useful for cleaning up deprecated configuration or removing sensitive data.

Example response:
Successfully deleted environment variables: OLD_API_KEY, DEPRECATED_FLAG
23 environment variables remaining.

Use cases:
- Removing deprecated API keys or credentials
- Cleaning up after feature flag removal
- Removing temporary configuration values
- Deleting test or staging variables from production
- Removing unused third-party service configurations
- Batch cleanup of multiple obsolete variables

Important notes:
- Changes require a deployment to take effect
- Deleted variables cannot be recovered - verify before deletion
- Use getEnvVars to see current variables before deletion
- Requires READONLY=false in configuration
- Be cautious when deleting critical variables like database URLs`,
    inputSchema: {
      type: 'object',
      properties: {
        names: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: PARAM_DESCRIPTIONS.names,
        },
      },
      required: ['names'],
      additionalProperties: false,
    },
    handler: async (args: unknown) => {
      const validatedArgs = DeleteEnvVarsSchema.parse(args);
      const client = clientFactory();

      try {
        const remainingVars = await client.deleteEnvVars(validatedArgs.names);

        const deletedNames = validatedArgs.names.join(', ');
        const remainingCount = remainingVars.length;

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted environment variables: ${deletedNames}\n${remainingCount} environment variable${remainingCount !== 1 ? 's' : ''} remaining.`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error deleting environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
