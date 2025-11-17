import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getNewsletterPosts } from './tools/get-newsletter-posts.js';
import { getNewsletterPost } from './tools/get-newsletter-post.js';
import { draftNewsletterPost } from './tools/draft-newsletter-post.js';
import { updateNewsletterPost } from './tools/update-newsletter-post.js';
import { uploadImage } from './tools/upload-image.js';
import { getAuthors } from './tools/get-authors.js';
import { searchMCPImplementations } from './tools/search-mcp-implementations.js';

/**
 * Tool group definitions - groups of related tools that can be enabled/disabled together
 */
export type ToolGroup = 'newsletter' | 'server_queue';

interface Tool {
  name: string;
  description: string;
  inputSchema: {
    type: string;
    properties: Record<string, unknown>;
    required?: string[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handler: (args: any) => Promise<any>;
}

interface ToolDefinition {
  factory: (server: Server, clientFactory: ClientFactory) => Tool;
  groups: ToolGroup[];
}

const ALL_TOOLS: ToolDefinition[] = [
  { factory: getNewsletterPosts, groups: ['newsletter'] },
  { factory: getNewsletterPost, groups: ['newsletter'] },
  { factory: draftNewsletterPost, groups: ['newsletter'] },
  { factory: updateNewsletterPost, groups: ['newsletter'] },
  { factory: uploadImage, groups: ['newsletter'] },
  { factory: getAuthors, groups: ['newsletter'] },
  { factory: searchMCPImplementations, groups: ['server_queue'] },
];

/**
 * Parse enabled tool groups from environment variable or parameter
 * @param enabledGroupsParam - Comma-separated list of tool groups (e.g., "newsletter,server_queue")
 * @returns Array of enabled tool groups
 */
export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  const groupsStr = enabledGroupsParam || process.env.PULSEMCP_ADMIN_ENABLED_TOOLGROUPS || '';

  if (!groupsStr) {
    // Default: all groups enabled
    return ['newsletter', 'server_queue'];
  }

  const groups = groupsStr.split(',').map((g) => g.trim());
  const validGroups: ToolGroup[] = [];

  for (const group of groups) {
    if (group === 'newsletter' || group === 'server_queue') {
      validGroups.push(group);
    } else {
      console.warn(`Unknown tool group: ${group}`);
    }
  }

  return validGroups;
}

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * Tool groups can be enabled/disabled via the PULSEMCP_ADMIN_ENABLED_TOOLGROUPS
 * environment variable (comma-separated list, e.g., "newsletter,server_queue").
 * If not set, all tool groups are enabled by default.
 *
 * @param clientFactory - Factory function that creates client instances
 * @param enabledGroups - Optional comma-separated list of enabled tool groups (overrides env var)
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: string) {
  return (server: Server) => {
    const enabledToolGroups = parseEnabledToolGroups(enabledGroups);

    // Filter tools based on enabled groups
    const enabledTools = ALL_TOOLS.filter((toolDef) =>
      toolDef.groups.some((group) => enabledToolGroups.includes(group))
    );

    // Create tool instances
    const tools = enabledTools.map((toolDef) => toolDef.factory(server, clientFactory));

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

// Keep the original registerTools for backward compatibility
export function registerTools(server: Server) {
  // This maintains compatibility but doesn't use dependency injection
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterTools for dependency injection'
    );
  };
  const register = createRegisterTools(factory);
  register(server);
}
