import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function getAppsTool(server: McpServer, clientFactory: () => IAppsignalClient) {
  return server.tool('get_apps', {}, async () => {
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
  });
}
