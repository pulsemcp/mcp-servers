import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { promises as fs } from 'fs';
import { GetServerCapabilitiesSchema, ServerConfig } from '../types.js';
import { createLogger } from '../logging.js';

const logger = createLogger('get-server-capabilities-tool');

// Parameter descriptions for consistency
const PARAM_DESCRIPTIONS = {
  server_names: 'Names of servers to query',
} as const;

export function getServerCapabilitiesTool(server: Server, configPath: string) {
  return {
    name: 'get_server_capabilities',
    description: `Retrieves capabilities and descriptions for specified MCP servers. This tool helps understand what each server can do without installing them, useful for making informed decisions about server selection.

Example response:
{
  "servers": [
    {
      "name": "com.postgres/mcp",
      "description": "PostgreSQL database integration for MCP",
      "capabilities": {
        "tools": ["query", "list_tables", "describe_table", "execute_sql"],
        "resources": ["database_schema", "connection_status"],
        "prompts": ["generate_query", "optimize_query"]
      }
    },
    {
      "name": "com.microsoft/playwright",
      "description": "Browser automation and web testing",
      "capabilities": {
        "tools": ["navigate", "click", "type", "screenshot", "evaluate"],
        "resources": ["browser_state", "page_content"]
      }
    }
  ]
}

Use cases:
- Understanding server capabilities before installation
- Planning which servers to use for complex tasks
- Documenting available MCP servers
- Comparing capabilities across different servers
- Building server selection strategies
- Creating capability matrices for reference`,

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
      },
      required: ['server_names'],
    },

    handler: async (args: unknown) => {
      try {
        const validatedArgs = GetServerCapabilitiesSchema.parse(args);

        logger.debug(`Getting capabilities for ${validatedArgs.server_names.length} servers`);

        // Read server configurations
        const allServersConfig: ServerConfig[] = JSON.parse(await fs.readFile(configPath, 'utf-8'));

        const servers = validatedArgs.server_names.map((name) => {
          const serverConfig = allServersConfig.find((s) => s.name === name);

          if (!serverConfig) {
            return {
              name,
              description: 'Server not found in configuration',
              capabilities: {},
            };
          }

          // In a real implementation, we might query the actual servers
          // For now, return mock capabilities based on known servers
          const mockCapabilities: Record<
            string,
            { tools?: string[]; resources?: string[]; prompts?: string[] }
          > = {
            'com.postgres/mcp': {
              tools: ['query', 'list_tables', 'describe_table', 'execute_sql'],
              resources: ['database_schema', 'connection_status'],
              prompts: ['generate_query', 'optimize_query'],
            },
            'com.microsoft/playwright': {
              tools: ['navigate', 'click', 'type', 'screenshot', 'evaluate'],
              resources: ['browser_state', 'page_content'],
            },
            'com.pulsemcp/appsignal': {
              tools: ['get_incidents', 'get_logs', 'get_metrics', 'get_anomalies'],
              resources: ['app_status', 'error_rates'],
            },
            'com.pulsemcp/fetch': {
              tools: ['fetch_url', 'fetch_with_analysis'],
              resources: ['fetch_history'],
            },
            'com.twist/mcp': {
              tools: ['get_messages', 'post_message', 'get_threads'],
              resources: ['workspace_info', 'user_info'],
            },
          };

          return {
            name,
            description: serverConfig.description,
            capabilities: mockCapabilities[name] || {
              tools: ['Unknown - server capabilities not documented'],
            },
          };
        });

        logger.info(`Retrieved capabilities for ${servers.length} servers`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ servers }, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Failed to get server capabilities:', error);
        throw error;
      }
    },
  };
}
