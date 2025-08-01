import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ClientFactory } from '../server.js';

export function getEnvVarsTool(server: Server, clientFactory: ClientFactory) {
  return {
    name: 'getEnvVars',
    description: `Retrieve all environment variables from your Rails application running on Hatchbox via SSH. This tool connects to your server and reads environment variables directly from the running puma process, providing a complete view of your application's runtime configuration.

Example response:
Environment variables (85 total):

RAILS_ENV=production
DATABASE_URL=postgres://user:password@localhost/myapp_production
REDIS_URL=redis://localhost:6379/0
SECRET_KEY_BASE=abc123...
RAILS_MASTER_KEY=def456...
AWS_ACCESS_KEY_ID=AKIA...
SENDGRID_API_KEY=SG...
...

Use cases:
- Auditing all environment variables in production
- Verifying configuration after deployments
- Debugging environment-specific issues
- Checking which services are configured
- Comparing environments between servers

Note: Requires WEB_SERVER_IP_ADDRESS to be configured`,
    inputSchema: {
      type: 'object',
      properties: {},
      additionalProperties: false,
    },
    handler: async (_args: unknown) => {
      const client = clientFactory();

      if (!client.getEnvVars) {
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
        const envVars = await client.getEnvVars();

        // Format env vars for display
        const envVarsList = envVars.map((env) => `${env.name}=${env.value}`).join('\n');

        return {
          content: [
            {
              type: 'text',
              text: `Environment variables (${envVars.length} total):\n\n${envVarsList}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error retrieving environment variables: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  };
}
