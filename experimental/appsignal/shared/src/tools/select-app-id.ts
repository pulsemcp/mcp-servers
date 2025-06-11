import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { setSelectedAppId } from '../state.js';

export function selectAppIdTool(server: McpServer, enableMainTools?: () => void) {
  return server.tool(
    "select_app_id",
    { appId: z.string().describe("The AppSignal application ID to select") },
    async ({ appId }) => {
      // Store the selected app ID
      setSelectedAppId(appId);

      // Enable the other tools if they were disabled
      if (enableMainTools) {
        enableMainTools();
      }

      return {
        content: [
          {
            type: "text",
            text: `Successfully selected app ID: ${appId}. All AppSignal tools are now available.`,
          },
        ],
      };
    }
  );
}