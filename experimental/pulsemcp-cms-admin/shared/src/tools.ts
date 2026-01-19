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
import { getDraftMCPImplementations } from './tools/get-draft-mcp-implementations.js';
import { saveMCPImplementation } from './tools/save-mcp-implementation.js';
import { sendMCPImplementationPostingNotification } from './tools/send-mcp-implementation-posting-notification.js';
import { findProviders } from './tools/find-providers.js';
import { getOfficialMirrorQueueItems } from './tools/get-official-mirror-queue-items.js';
import { getOfficialMirrorQueueItem } from './tools/get-official-mirror-queue-item.js';
import { approveOfficialMirrorQueueItem } from './tools/approve-official-mirror-queue-item.js';
import { approveOfficialMirrorQueueItemWithoutModifying } from './tools/approve-official-mirror-queue-item-without-modifying.js';
import { rejectOfficialMirrorQueueItem } from './tools/reject-official-mirror-queue-item.js';
import { addOfficialMirrorToRegularQueue } from './tools/add-official-mirror-to-regular-queue.js';
import { unlinkOfficialMirrorQueueItem } from './tools/unlink-official-mirror-queue-item.js';
// Unofficial mirrors tools
import { getUnofficialMirrors } from './tools/get-unofficial-mirrors.js';
import { getUnofficialMirror } from './tools/get-unofficial-mirror.js';
import { createUnofficialMirror } from './tools/create-unofficial-mirror.js';
import { updateUnofficialMirror } from './tools/update-unofficial-mirror.js';
import { deleteUnofficialMirror } from './tools/delete-unofficial-mirror.js';
// Official mirrors REST tools (read-only)
import { getOfficialMirrors } from './tools/get-official-mirrors.js';
import { getOfficialMirror } from './tools/get-official-mirror.js';
// Tenant tools (read-only)
import { getTenants } from './tools/get-tenants.js';
import { getTenant } from './tools/get-tenant.js';
// MCP JSON tools
import { getMcpJsons } from './tools/get-mcp-jsons.js';
import { getMcpJson } from './tools/get-mcp-json.js';
import { createMcpJson } from './tools/create-mcp-json.js';
import { updateMcpJson } from './tools/update-mcp-json.js';
import { deleteMcpJson } from './tools/delete-mcp-json.js';
// Unified MCP Server tools
import { listMCPServers } from './tools/list-mcp-servers.js';
import { getMCPServer } from './tools/get-mcp-server.js';
import { updateMCPServer } from './tools/update-mcp-server.js';

/**
 * Tool group definitions - groups of related tools that can be enabled/disabled together
 *
 * Each group has two variants:
 * - Base group (e.g., 'newsletter'): Includes all tools (read + write operations)
 * - Readonly group (e.g., 'newsletter_readonly'): Includes only read operations
 *
 * Groups:
 * - newsletter / newsletter_readonly: Newsletter-related tools (posts, authors, images)
 * - server_queue / server_queue_readonly: Server queue tools (search, drafts, providers, save, notifications)
 * - official_queue / official_queue_readonly: Official mirror queue tools (list, get, approve, reject, unlink)
 * - unofficial_mirrors / unofficial_mirrors_readonly: Unofficial mirror CRUD tools
 * - official_mirrors_readonly: Official mirrors read-only tools (REST API)
 * - tenants_readonly: Tenant read-only tools
 * - mcp_jsons / mcp_jsons_readonly: MCP JSON configuration tools
 * - mcp_servers / mcp_servers_readonly: Unified MCP server tools (abstracted interface)
 */
export type ToolGroup =
  | 'newsletter'
  | 'newsletter_readonly'
  | 'server_queue'
  | 'server_queue_readonly'
  | 'official_queue'
  | 'official_queue_readonly'
  | 'unofficial_mirrors'
  | 'unofficial_mirrors_readonly'
  | 'official_mirrors'
  | 'official_mirrors_readonly'
  | 'tenants'
  | 'tenants_readonly'
  | 'mcp_jsons'
  | 'mcp_jsons_readonly'
  | 'mcp_servers'
  | 'mcp_servers_readonly';

/** Base groups without _readonly suffix */
type BaseToolGroup =
  | 'newsletter'
  | 'server_queue'
  | 'official_queue'
  | 'unofficial_mirrors'
  | 'official_mirrors'
  | 'tenants'
  | 'mcp_jsons'
  | 'mcp_servers';

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
  /** The base group this tool belongs to (without _readonly suffix) */
  group: BaseToolGroup;
  /** If true, this tool is excluded from _readonly groups */
  isWriteOperation: boolean;
}

const ALL_TOOLS: ToolDefinition[] = [
  // Newsletter tools (all are write operations except get_newsletter_posts/post and get_authors)
  { factory: getNewsletterPosts, group: 'newsletter', isWriteOperation: false },
  { factory: getNewsletterPost, group: 'newsletter', isWriteOperation: false },
  { factory: draftNewsletterPost, group: 'newsletter', isWriteOperation: true },
  { factory: updateNewsletterPost, group: 'newsletter', isWriteOperation: true },
  { factory: uploadImage, group: 'newsletter', isWriteOperation: true },
  { factory: getAuthors, group: 'newsletter', isWriteOperation: false },
  // Server queue tools
  { factory: searchMCPImplementations, group: 'server_queue', isWriteOperation: false },
  { factory: getDraftMCPImplementations, group: 'server_queue', isWriteOperation: false },
  { factory: saveMCPImplementation, group: 'server_queue', isWriteOperation: true },
  {
    factory: sendMCPImplementationPostingNotification,
    group: 'server_queue',
    isWriteOperation: true,
  },
  { factory: findProviders, group: 'server_queue', isWriteOperation: false },
  // Official mirror queue tools
  { factory: getOfficialMirrorQueueItems, group: 'official_queue', isWriteOperation: false },
  { factory: getOfficialMirrorQueueItem, group: 'official_queue', isWriteOperation: false },
  { factory: approveOfficialMirrorQueueItem, group: 'official_queue', isWriteOperation: true },
  {
    factory: approveOfficialMirrorQueueItemWithoutModifying,
    group: 'official_queue',
    isWriteOperation: true,
  },
  { factory: rejectOfficialMirrorQueueItem, group: 'official_queue', isWriteOperation: true },
  { factory: addOfficialMirrorToRegularQueue, group: 'official_queue', isWriteOperation: true },
  { factory: unlinkOfficialMirrorQueueItem, group: 'official_queue', isWriteOperation: true },
  // Unofficial mirrors tools (CRUD)
  { factory: getUnofficialMirrors, group: 'unofficial_mirrors', isWriteOperation: false },
  { factory: getUnofficialMirror, group: 'unofficial_mirrors', isWriteOperation: false },
  { factory: createUnofficialMirror, group: 'unofficial_mirrors', isWriteOperation: true },
  { factory: updateUnofficialMirror, group: 'unofficial_mirrors', isWriteOperation: true },
  { factory: deleteUnofficialMirror, group: 'unofficial_mirrors', isWriteOperation: true },
  // Official mirrors REST tools (read-only)
  { factory: getOfficialMirrors, group: 'official_mirrors', isWriteOperation: false },
  { factory: getOfficialMirror, group: 'official_mirrors', isWriteOperation: false },
  // Tenant tools (read-only)
  { factory: getTenants, group: 'tenants', isWriteOperation: false },
  { factory: getTenant, group: 'tenants', isWriteOperation: false },
  // MCP JSON tools (CRUD)
  { factory: getMcpJsons, group: 'mcp_jsons', isWriteOperation: false },
  { factory: getMcpJson, group: 'mcp_jsons', isWriteOperation: false },
  { factory: createMcpJson, group: 'mcp_jsons', isWriteOperation: true },
  { factory: updateMcpJson, group: 'mcp_jsons', isWriteOperation: true },
  { factory: deleteMcpJson, group: 'mcp_jsons', isWriteOperation: true },
  // Unified MCP Server tools (abstracted interface)
  { factory: listMCPServers, group: 'mcp_servers', isWriteOperation: false },
  { factory: getMCPServer, group: 'mcp_servers', isWriteOperation: false },
  { factory: updateMCPServer, group: 'mcp_servers', isWriteOperation: true },
];

/**
 * All valid tool groups (base groups and their _readonly variants)
 */
const VALID_TOOL_GROUPS: ToolGroup[] = [
  'newsletter',
  'newsletter_readonly',
  'server_queue',
  'server_queue_readonly',
  'official_queue',
  'official_queue_readonly',
  'unofficial_mirrors',
  'unofficial_mirrors_readonly',
  'official_mirrors',
  'official_mirrors_readonly',
  'tenants',
  'tenants_readonly',
  'mcp_jsons',
  'mcp_jsons_readonly',
  'mcp_servers',
  'mcp_servers_readonly',
];

/**
 * Base groups (without _readonly suffix) - used for default "all groups" behavior
 */
const BASE_TOOL_GROUPS: BaseToolGroup[] = [
  'newsletter',
  'server_queue',
  'official_queue',
  'unofficial_mirrors',
  'official_mirrors',
  'tenants',
  'mcp_jsons',
  'mcp_servers',
];

/**
 * Parse enabled tool groups from environment variable or parameter
 * @param enabledGroupsParam - Comma-separated list of tool groups (e.g., "newsletter,server_queue_readonly")
 * @returns Array of enabled tool groups
 */
export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  const groupsStr = enabledGroupsParam || process.env.TOOL_GROUPS || '';

  if (!groupsStr) {
    // Default: all base groups enabled (full read+write access)
    return [...BASE_TOOL_GROUPS];
  }

  const groups = groupsStr.split(',').map((g) => g.trim());
  const validGroups: ToolGroup[] = [];

  for (const group of groups) {
    if (
      VALID_TOOL_GROUPS.includes(group as ToolGroup) &&
      !validGroups.includes(group as ToolGroup)
    ) {
      validGroups.push(group as ToolGroup);
    } else if (!VALID_TOOL_GROUPS.includes(group as ToolGroup)) {
      console.warn(`Unknown tool group: ${group}`);
    }
  }

  return validGroups;
}

/**
 * Check if a tool should be included based on enabled groups
 * @param toolDef - The tool definition to check
 * @param enabledGroups - Array of enabled tool groups
 * @returns true if the tool should be included
 */
function shouldIncludeTool(toolDef: ToolDefinition, enabledGroups: ToolGroup[]): boolean {
  const baseGroup = toolDef.group;
  const readonlyGroup = `${baseGroup}_readonly` as ToolGroup;

  // Check if the base group (full access) is enabled
  if (enabledGroups.includes(baseGroup as ToolGroup)) {
    return true;
  }

  // Check if the readonly group is enabled (only include read operations)
  if (enabledGroups.includes(readonlyGroup) && !toolDef.isWriteOperation) {
    return true;
  }

  return false;
}

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * Tool groups can be enabled/disabled via the TOOL_GROUPS environment variable
 * (comma-separated list, e.g., "newsletter,server_queue_readonly"). If not set, all
 * base tool groups are enabled by default (full read+write access).
 *
 * Available tool groups:
 * - newsletter: All newsletter-related tools (read + write)
 * - newsletter_readonly: Newsletter tools (read only)
 * - server_queue: MCP implementation queue tools (read + write)
 * - server_queue_readonly: MCP implementation queue tools (read only)
 * - official_queue: Official mirror queue tools (read + write)
 * - official_queue_readonly: Official mirror queue tools (read only)
 * - unofficial_mirrors: Unofficial mirror CRUD tools (read + write)
 * - unofficial_mirrors_readonly: Unofficial mirror tools (read only)
 * - official_mirrors_readonly: Official mirrors REST API tools (read only)
 * - tenants_readonly: Tenant tools (read only)
 * - mcp_jsons: MCP JSON configuration tools (read + write)
 * - mcp_jsons_readonly: MCP JSON tools (read only)
 * - mcp_servers: Unified MCP server tools with abstracted interface (read + write)
 * - mcp_servers_readonly: Unified MCP server tools (read only)
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
      shouldIncludeTool(toolDef, enabledToolGroups)
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
