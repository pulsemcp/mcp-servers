import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getAppsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool(
    'get_apps',
    `Retrieve a list of all available AppSignal applications associated with your account. This tool is essential for discovering which applications you can monitor and must be used before selecting a specific app to work with. Returns an array of application objects containing details like app ID, name, environment, and other metadata. This is typically the first tool you'll use when starting an AppSignal monitoring session.

Example response:
{
  "apps": [
    {
      "id": "app-123",
      "name": "Production API",
      "environment": "production",
      "active": true
    },
    {
      "id": "app-456", 
      "name": "Staging API",
      "environment": "staging",
      "active": true
    }
  ]
}

Use cases:
- Starting a monitoring session by listing available apps
- Verifying which applications are configured in AppSignal
- Finding the correct app ID to use with other monitoring tools`,
    {},
    async () => {
      try {
        const client = clientFactory();
        const apps = await client.getApps();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  apps: apps,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error fetching apps: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
        };
      }
    }
  );
}
