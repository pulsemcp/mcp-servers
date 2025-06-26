import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { setSelectedAppId } from '../state.js';
import { IAppsignalClient } from '../appsignal-client/appsignal-client.js';

export function selectAppIdTool(
  server: McpServer,
  toolName: string,
  enableMainTools?: () => void,
  _clientFactory?: () => IAppsignalClient
) {
  return server.tool(
    toolName,
    `Select a specific AppSignal application to monitor and enable all incident management tools. This tool must be called after get_apps to activate the monitoring capabilities for a particular application. Once an app is selected, all other AppSignal tools (exception incidents, log incidents, anomaly detection, etc.) become available for use. The selection persists for the entire session unless changed.

Example usage:
- First use get_apps to list available applications
- Then call ${toolName} with the desired app ID: "app-123"
- All monitoring tools are now enabled for that application

This tool is crucial for:
- Activating incident monitoring tools for a specific app
- Switching between different applications during a session
- Establishing the context for all subsequent monitoring operations`,
    {
      appId: z
        .string()
        .describe('The AppSignal application ID to select from the list returned by get_apps'),
    },
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
