import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { setSelectedAppId, getSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function selectAppIdTool(
  server: McpServer,
  toolName: string,
  enableMainTools?: () => void,
  _clientFactory?: () => IAppsignalClient
) {
  return server.tool(
    toolName,
    { appId: z.string().describe('The AppSignal application ID to select') },
    async ({ appId }) => {
      // Store the selected app ID
      setSelectedAppId(appId);

      // Enable the other tools if they were disabled
      if (enableMainTools) {
        enableMainTools();
      }

      const action = toolName === 'change_app_id' ? 'changed' : 'selected';
      return {
        content: [
          {
            type: 'text',
            text: `Successfully ${action} app ID: ${appId}. All AppSignal tools are now available.`,
          },
        ],
      };
    }
  );
}
