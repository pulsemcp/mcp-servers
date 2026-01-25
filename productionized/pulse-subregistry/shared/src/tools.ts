import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ClientFactory } from './client.js';
import { listServersTool } from './tools/list-servers.js';
import { getServerTool } from './tools/get-server.js';
import { switchTenantIdTool } from './tools/switch-tenant-id.js';

interface ToolDefinition {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<{
    content: { type: string; text: string }[];
    isError?: boolean;
  }>;
}

export interface RegisterToolsOptions {
  showAdminTools?: boolean;
}

export function createRegisterTools(
  clientFactory: ClientFactory,
  options: RegisterToolsOptions = {}
) {
  return (server: Server) => {
    // Create tool instances
    const tools: ToolDefinition[] = [
      listServersTool(server, clientFactory),
      getServerTool(server, clientFactory),
    ];

    // Conditionally add admin tools
    if (options.showAdminTools) {
      tools.push(switchTenantIdTool(server, clientFactory));
    }

    // Register tool definitions
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    // Register tool handlers
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      const tool = tools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(`Unknown tool: ${name}`);
      }

      return await tool.handler(args);
    });
  };
}
