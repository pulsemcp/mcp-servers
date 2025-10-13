import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { IClaudeCodeClient } from '../claude-code-client/claude-code-client.js';
import { InstallServersSchema } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('install-servers-tool');

// Parameter descriptions for consistency
const PARAM_DESCRIPTIONS = {
  server_names: 'Names of servers to install (from find_servers output)',
  context: 'Optional: installation context for inference (purpose, environment, preferences)',
} as const;

export function installServersTool(server: Server, clientFactory: () => IClaudeCodeClient) {
  return {
    name: 'install_servers',
    description: `Installs and configures MCP servers on the subagent using your servers.json configurations. This tool updates the subagent's .mcp.json file and ensures all selected servers are properly configured with necessary credentials and settings.

Example response:
{
  "installations": [
    {
      "serverName": "com.postgres/mcp",
      "status": "success"
    },
    {
      "serverName": "com.pulsemcp/appsignal",
      "status": "success"
    },
    {
      "serverName": "com.microsoft/playwright",
      "status": "failed",
      "error": "Missing required environment variable: PLAYWRIGHT_API_KEY"
    }
  ],
  "mcpConfigPath": "/path/to/agent/.mcp.json"
}

Status meanings:
- success: Server installed and configured successfully
- failed: Installation failed (check error message for details)

Use cases:
- Installing servers identified by find_servers tool
- Configuring subagent with task-specific MCP servers
- Setting up server credentials and environment variables
- Updating subagent's MCP configuration dynamically
- Preparing subagent for specialized tasks with required tools`,

    inputSchema: {
      type: 'object',
      properties: {
        server_names: {
          type: 'array',
          items: {
            type: 'string',
          },
          description: PARAM_DESCRIPTIONS.server_names,
        },
        context: {
          type: 'object',
          properties: {
            purpose: {
              type: 'string',
              description: 'Description of the task purpose for better server configuration',
            },
          },
          description: PARAM_DESCRIPTIONS.context,
        },
      },
      required: ['server_names'],
    },

    handler: async (args: unknown) => {
      try {
        const validatedArgs = InstallServersSchema.parse(args);
        const client = clientFactory();

        logger.debug(`Installing ${validatedArgs.server_names.length} servers`);

        const result = await client.installServers(
          validatedArgs.server_names,
          validatedArgs.context
        );

        const successCount = result.installations.filter((i) => i.status === 'success').length;
        logger.info(
          `Successfully installed ${successCount} of ${validatedArgs.server_names.length} servers`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to install servers:', error);
        throw error;
      }
    },
  };
}
