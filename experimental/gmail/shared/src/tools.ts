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
 * Available tool groups for Gmail MCP server
 * - readonly: Read-only operations (list, get, search emails)
 * - readwrite: Read and write operations (includes readonly + modify, draft)
 * - readwrite_external: External communication operations (includes readwrite + send_email)
 */
export type ToolGroup = 'readonly' | 'readwrite' | 'readwrite_external';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'readwrite', 'readwrite_external'];

interface ToolDefinition {
  factory: ToolFactory;
  groups: ToolGroup[];
}

/**
 * All available tools with their group assignments
 *
 * readonly: list_email_conversations, get_email_conversation, search_email_conversations
 * readwrite: all readonly tools + change_email_conversation, draft_email
 * readwrite_external: all readwrite tools + send_email (external communication)
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Read-only tools (available in all groups)
  { factory: listEmailConversationsTool, groups: ['readonly', 'readwrite', 'readwrite_external'] },
  { factory: getEmailConversationTool, groups: ['readonly', 'readwrite', 'readwrite_external'] },
  {
    factory: searchEmailConversationsTool,
    groups: ['readonly', 'readwrite', 'readwrite_external'],
  },
  // Write tools (available in readwrite and readwrite_external)
  { factory: changeEmailConversationTool, groups: ['readwrite', 'readwrite_external'] },
  { factory: draftEmailTool, groups: ['readwrite', 'readwrite_external'] },
  // External communication tools (only in readwrite_external - most dangerous)
  { factory: sendEmailTool, groups: ['readwrite_external'] },
];

/**
 * Parses the ENABLED_TOOLGROUPS environment variable
 * @param enabledGroupsParam - Comma-separated list of tool groups
 * @returns Array of valid tool groups
 */
export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  if (!enabledGroupsParam) {
    return ALL_TOOL_GROUPS; // All groups enabled by default
  }

  const requestedGroups = enabledGroupsParam.split(',').map((g) => g.trim().toLowerCase());

  const validGroups = requestedGroups.filter((g): g is ToolGroup =>
    ALL_TOOL_GROUPS.includes(g as ToolGroup)
  );

  if (validGroups.length === 0) {
    console.error(
      `Warning: No valid tool groups found in "${enabledGroupsParam}". ` +
        `Valid groups: ${ALL_TOOL_GROUPS.join(', ')}. Using all groups.`
    );
    return ALL_TOOL_GROUPS;
  }

  return validGroups;
}

/**
 * Gets all available tool group names
 */
export function getAvailableToolGroups(): ToolGroup[] {
  return [...ALL_TOOL_GROUPS];
}

/**
 * Creates a function to register tools with the server based on enabled groups
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  // Parse enabled groups from environment or use provided array
  const groups = enabledGroups || parseEnabledToolGroups(process.env.GMAIL_ENABLED_TOOLGROUPS);

  return (server: Server) => {
    // Filter tools by enabled groups and create instances
    const tools = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g))).map((def) =>
      def.factory(server, clientFactory)
    );

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
