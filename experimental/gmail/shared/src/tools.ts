import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { listEmailConversationsTool } from './tools/list-email-conversations.js';
import { getEmailConversationTool } from './tools/get-email-conversation.js';
import { changeEmailConversationTool } from './tools/change-email-conversation.js';
import { draftEmailTool } from './tools/draft-email.js';
import { sendEmailTool } from './tools/send-email.js';
import { searchEmailConversationsTool } from './tools/search-email-conversations.js';

/**
 * Generic tool interface
 */
interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (args: unknown) => Promise<{
    content: Array<{ type: string; text: string }>;
    isError?: boolean;
  }>;
}

type ToolFactory = (server: Server, clientFactory: ClientFactory) => Tool;

/**
 * All available tools
 */
const ALL_TOOLS: ToolFactory[] = [
  listEmailConversationsTool,
  getEmailConversationTool,
  searchEmailConversationsTool,
  changeEmailConversationTool,
  draftEmailTool,
  sendEmailTool,
];

/**
 * Creates a function to register all tools with the server
 */
export function createRegisterTools(clientFactory: ClientFactory) {
  return (server: Server) => {
    // Create tool instances
    const tools = ALL_TOOLS.map((factory) => factory(server, clientFactory));

    // List available tools
    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

    // Handle tool calls
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

/**
 * Backward compatibility export
 */
export function registerTools(server: Server) {
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterTools for dependency injection'
    );
  };
  const register = createRegisterTools(factory);
  register(server);
}
