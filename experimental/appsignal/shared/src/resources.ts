import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { getEffectiveAppId, isAppIdLocked } from './state.js';

export function registerResources(server: McpServer) {
  server.resource('config', 'appsignal://config', async (uri) => ({
    contents: [
      {
        uri: uri.href,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            apiKey: process.env.APPSIGNAL_API_KEY ? '***configured***' : 'not configured',
            appId: getEffectiveAppId() || 'not configured',
            isLocked: isAppIdLocked(),
          },
          null,
          2
        ),
      },
    ],
  }));
}
