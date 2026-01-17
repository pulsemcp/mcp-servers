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

/**
 * Tool group definitions - groups of related tools that can be enabled/disabled together
 *
 * - newsletter: All newsletter-related tools (posts, authors, images)
 * - server_queue: Server queue tools (search, get drafts, providers, save, notifications)
 * - official_queue: Official mirror queue tools (list, get, approve, reject, unlink)
 */
export type ToolGroup = 'newsletter' | 'server_queue' | 'official_queue';

/**
 * Tool group filter definitions - filters that can be applied to enabled tool groups
 *
 * - readonly: Filters out write operations, keeping only read-only tools
 */
export type ToolGroupFilter = 'readonly';

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
  group: ToolGroup;
  /** If true, this tool is filtered out when the 'readonly' filter is active */
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
];

/**
 * All valid tool groups
 */
const VALID_TOOL_GROUPS: ToolGroup[] = ['newsletter', 'server_queue', 'official_queue'];

/**
 * All valid tool group filters
 */
const VALID_TOOL_GROUP_FILTERS: ToolGroupFilter[] = ['readonly'];

/**
 * Parse enabled tool groups from environment variable or parameter
 * @param enabledGroupsParam - Comma-separated list of tool groups (e.g., "newsletter,server_queue")
 * @returns Array of enabled tool groups
 */
export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  // Check new env var first, then fall back to legacy env var for backwards compatibility
  const groupsStr =
    enabledGroupsParam ||
    process.env.TOOL_GROUPS ||
    process.env.PULSEMCP_ADMIN_ENABLED_TOOLGROUPS ||
    '';

  if (!groupsStr) {
    // Default: all groups enabled
    return [...VALID_TOOL_GROUPS];
  }

  const groups = groupsStr.split(',').map((g) => g.trim());
  const validGroups: ToolGroup[] = [];

  for (const group of groups) {
    // Handle legacy group names for backwards compatibility
    const normalizedGroup = normalizeLegacyToolGroup(group);
    if (normalizedGroup && !validGroups.includes(normalizedGroup)) {
      validGroups.push(normalizedGroup);
    } else if (!normalizedGroup) {
      console.warn(`Unknown tool group: ${group}`);
    }
  }

  return validGroups;
}

/**
 * Normalize legacy tool group names to new names
 * @param group - Tool group name (possibly legacy)
 * @returns Normalized tool group name or null if invalid
 */
function normalizeLegacyToolGroup(group: string): ToolGroup | null {
  // New group names
  if (VALID_TOOL_GROUPS.includes(group as ToolGroup)) {
    return group as ToolGroup;
  }

  // Legacy group names mapping
  const legacyMapping: Record<string, ToolGroup> = {
    server_queue_readonly: 'server_queue',
    server_queue_all: 'server_queue',
    official_queue_readonly: 'official_queue',
    official_queue_all: 'official_queue',
  };

  return legacyMapping[group] || null;
}

/**
 * Parse tool group filters from environment variable or parameter
 * @param filtersParam - Comma-separated list of filters (e.g., "readonly")
 * @returns Array of active filters
 */
export function parseToolGroupFilters(filtersParam?: string): ToolGroupFilter[] {
  const filtersStr = filtersParam || process.env.TOOL_GROUP_FILTERS || '';

  if (!filtersStr) {
    // Default: no filters active
    return [];
  }

  const filters = filtersStr.split(',').map((f) => f.trim());
  const validFilters: ToolGroupFilter[] = [];

  for (const filter of filters) {
    if (VALID_TOOL_GROUP_FILTERS.includes(filter as ToolGroupFilter)) {
      validFilters.push(filter as ToolGroupFilter);
    } else {
      console.warn(`Unknown tool group filter: ${filter}`);
    }
  }

  return validFilters;
}

/**
 * Creates a function to register all tools with the server.
 * This pattern uses individual tool files for better modularity and testability.
 *
 * Each tool is defined in its own file under the `tools/` directory and follows
 * a factory pattern that accepts the server and clientFactory as parameters.
 *
 * Tool groups can be enabled/disabled via the TOOL_GROUPS environment variable
 * (comma-separated list, e.g., "newsletter,server_queue"). If not set, all tool
 * groups are enabled by default.
 *
 * Tool group filters can be applied via the TOOL_GROUP_FILTERS environment variable
 * (comma-separated list, e.g., "readonly"). If not set, no filters are applied.
 *
 * Available tool groups:
 * - newsletter: All newsletter-related tools
 * - server_queue: MCP implementation queue tools (search, drafts, save, notifications)
 * - official_queue: Official mirror queue tools (list, get, approve, reject, unlink)
 *
 * Available filters:
 * - readonly: Filters out write operations, keeping only read-only tools
 *
 * @param clientFactory - Factory function that creates client instances
 * @param enabledGroups - Optional comma-separated list of enabled tool groups (overrides env var)
 * @param activeFilters - Optional comma-separated list of active filters (overrides env var)
 * @returns Function that registers all tools with a server
 */
export function createRegisterTools(
  clientFactory: ClientFactory,
  enabledGroups?: string,
  activeFilters?: string
) {
  return (server: Server) => {
    const enabledToolGroups = parseEnabledToolGroups(enabledGroups);
    const filters = parseToolGroupFilters(activeFilters);

    // Filter tools based on enabled groups
    let enabledTools = ALL_TOOLS.filter((toolDef) => enabledToolGroups.includes(toolDef.group));

    // Apply readonly filter if active
    if (filters.includes('readonly')) {
      enabledTools = enabledTools.filter((toolDef) => !toolDef.isWriteOperation);
    }

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
