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
// Redirect tools
import { getRedirects } from './tools/get-redirects.js';
import { getRedirect } from './tools/get-redirect.js';
import { createRedirect } from './tools/create-redirect.js';
import { updateRedirect } from './tools/update-redirect.js';
import { deleteRedirect } from './tools/delete-redirect.js';
// GoodJob tools
import { listGoodJobs } from './tools/list-good-jobs.js';
import { getGoodJob } from './tools/get-good-job.js';
import { listGoodJobCronSchedules } from './tools/list-good-job-cron-schedules.js';
import { listGoodJobProcesses } from './tools/list-good-job-processes.js';
import { getGoodJobQueueStatistics } from './tools/get-good-job-queue-statistics.js';
import { retryGoodJob } from './tools/retry-good-job.js';
import { discardGoodJob } from './tools/discard-good-job.js';
import { rescheduleGoodJob } from './tools/reschedule-good-job.js';
import { forceTriggerGoodJobCron } from './tools/force-trigger-good-job-cron.js';
import { cleanupGoodJobs } from './tools/cleanup-good-jobs.js';
// Proctor tools
import { runExamForMirror } from './tools/run-exam-for-mirror.js';
import { getExamResult } from './tools/get-exam-result.js';
import { saveResultsForMirror } from './tools/save-results-for-mirror.js';
import { listProctorRuns } from './tools/list-proctor-runs.js';
// Discovered URLs tools
import { listDiscoveredUrls } from './tools/list-discovered-urls.js';
import { markDiscoveredUrlProcessed } from './tools/mark-discovered-url-processed.js';
import { getDiscoveredUrlStats } from './tools/get-discovered-url-stats.js';

/**
 * Tool group definitions - groups of related tools that can be enabled/disabled together
 *
 * Each group has two variants:
 * - Base group (e.g., 'newsletter'): Includes all tools (read + write operations)
 * - Readonly group (e.g., 'newsletter_readonly'): Includes only read operations
 *
 * Tools can belong to multiple groups. A tool is included if ANY of its groups are enabled.
 * The `server_directory` group is a superset that includes tools from mcp_servers,
 * unofficial_mirrors, official_mirrors, official_queue, and mcp_jsons for comprehensive
 * server directory management.
 *
 * Groups:
 * - newsletter / newsletter_readonly: Newsletter-related tools (posts, authors, images)
 * - server_directory / server_directory_readonly: Comprehensive server directory tools (includes mcp_servers, implementations, mirrors, queue, mcp_jsons, providers)
 * - official_queue / official_queue_readonly: Official mirror queue tools (list, get, approve, reject, unlink)
 * - unofficial_mirrors / unofficial_mirrors_readonly: Unofficial mirror CRUD tools
 * - official_mirrors_readonly: Official mirrors read-only tools (REST API)
 * - tenants_readonly: Tenant read-only tools
 * - mcp_jsons / mcp_jsons_readonly: MCP JSON configuration tools
 * - mcp_servers / mcp_servers_readonly: Unified MCP server tools (abstracted interface)
 * - redirects / redirects_readonly: URL redirect management tools
 * - good_jobs / good_jobs_readonly: GoodJob background job management tools
 * - proctor / proctor_readonly: Proctor exam execution and result storage tools. The readonly variant includes get_exam_result and list_proctor_runs for retrieving stored results without running exams or saving
 * - discovered_urls / discovered_urls_readonly: Discovered URL management tools for processing URLs into MCP implementations
 * - notifications: Notification email tools (send_impl_posted_notif). Separated from server_directory so notification capability can be granted independently.
 */
export type ToolGroup =
  | 'newsletter'
  | 'newsletter_readonly'
  | 'server_directory'
  | 'server_directory_readonly'
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
  | 'mcp_servers_readonly'
  | 'redirects'
  | 'redirects_readonly'
  | 'good_jobs'
  | 'good_jobs_readonly'
  | 'proctor'
  | 'proctor_readonly'
  | 'discovered_urls'
  | 'discovered_urls_readonly'
  | 'notifications';

/** Base groups without _readonly suffix */
type BaseToolGroup =
  | 'newsletter'
  | 'server_directory'
  | 'official_queue'
  | 'unofficial_mirrors'
  | 'official_mirrors'
  | 'tenants'
  | 'mcp_jsons'
  | 'mcp_servers'
  | 'redirects'
  | 'good_jobs'
  | 'proctor'
  | 'discovered_urls'
  | 'notifications';

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
  /** The base groups this tool belongs to (without _readonly suffix). A tool is included if ANY of its groups are enabled. */
  groups: BaseToolGroup[];
  /** If true, this tool is excluded from _readonly groups */
  isWriteOperation: boolean;
}

const ALL_TOOLS: ToolDefinition[] = [
  // Newsletter tools (all are write operations except get_newsletter_posts/post and get_authors)
  { factory: getNewsletterPosts, groups: ['newsletter'], isWriteOperation: false },
  { factory: getNewsletterPost, groups: ['newsletter'], isWriteOperation: false },
  { factory: draftNewsletterPost, groups: ['newsletter'], isWriteOperation: true },
  { factory: updateNewsletterPost, groups: ['newsletter'], isWriteOperation: true },
  { factory: uploadImage, groups: ['newsletter'], isWriteOperation: true },
  { factory: getAuthors, groups: ['newsletter'], isWriteOperation: false },
  // Server directory tools (also included in the server_directory superset)
  {
    factory: searchMCPImplementations,
    groups: ['server_directory'],
    isWriteOperation: false,
  },
  {
    factory: getDraftMCPImplementations,
    groups: ['server_directory'],
    isWriteOperation: false,
  },
  { factory: saveMCPImplementation, groups: ['server_directory'], isWriteOperation: true },
  { factory: findProviders, groups: ['server_directory'], isWriteOperation: false },
  // Notification tools (separated from server_directory for isolation)
  {
    factory: sendMCPImplementationPostingNotification,
    groups: ['notifications'],
    isWriteOperation: true,
  },
  // Official mirror queue tools (also in server_directory)
  {
    factory: getOfficialMirrorQueueItems,
    groups: ['official_queue', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: getOfficialMirrorQueueItem,
    groups: ['official_queue', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: approveOfficialMirrorQueueItem,
    groups: ['official_queue', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: approveOfficialMirrorQueueItemWithoutModifying,
    groups: ['official_queue', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: rejectOfficialMirrorQueueItem,
    groups: ['official_queue', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: addOfficialMirrorToRegularQueue,
    groups: ['official_queue', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: unlinkOfficialMirrorQueueItem,
    groups: ['official_queue', 'server_directory'],
    isWriteOperation: true,
  },
  // Unofficial mirrors tools (CRUD) (also in server_directory)
  {
    factory: getUnofficialMirrors,
    groups: ['unofficial_mirrors', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: getUnofficialMirror,
    groups: ['unofficial_mirrors', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: createUnofficialMirror,
    groups: ['unofficial_mirrors', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: updateUnofficialMirror,
    groups: ['unofficial_mirrors', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: deleteUnofficialMirror,
    groups: ['unofficial_mirrors', 'server_directory'],
    isWriteOperation: true,
  },
  // Official mirrors REST tools (read-only) (also in server_directory)
  {
    factory: getOfficialMirrors,
    groups: ['official_mirrors', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: getOfficialMirror,
    groups: ['official_mirrors', 'server_directory'],
    isWriteOperation: false,
  },
  // Tenant tools (read-only)
  { factory: getTenants, groups: ['tenants'], isWriteOperation: false },
  { factory: getTenant, groups: ['tenants'], isWriteOperation: false },
  // MCP JSON tools (CRUD) (also in server_directory)
  {
    factory: getMcpJsons,
    groups: ['mcp_jsons', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: getMcpJson,
    groups: ['mcp_jsons', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: createMcpJson,
    groups: ['mcp_jsons', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: updateMcpJson,
    groups: ['mcp_jsons', 'server_directory'],
    isWriteOperation: true,
  },
  {
    factory: deleteMcpJson,
    groups: ['mcp_jsons', 'server_directory'],
    isWriteOperation: true,
  },
  // Unified MCP Server tools (abstracted interface) (also in server_directory)
  {
    factory: listMCPServers,
    groups: ['mcp_servers', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: getMCPServer,
    groups: ['mcp_servers', 'server_directory'],
    isWriteOperation: false,
  },
  {
    factory: updateMCPServer,
    groups: ['mcp_servers', 'server_directory'],
    isWriteOperation: true,
  },
  // Redirect tools (CRUD)
  { factory: getRedirects, groups: ['redirects'], isWriteOperation: false },
  { factory: getRedirect, groups: ['redirects'], isWriteOperation: false },
  { factory: createRedirect, groups: ['redirects'], isWriteOperation: true },
  { factory: updateRedirect, groups: ['redirects'], isWriteOperation: true },
  { factory: deleteRedirect, groups: ['redirects'], isWriteOperation: true },
  // GoodJob tools
  { factory: listGoodJobs, groups: ['good_jobs'], isWriteOperation: false },
  { factory: getGoodJob, groups: ['good_jobs'], isWriteOperation: false },
  { factory: listGoodJobCronSchedules, groups: ['good_jobs'], isWriteOperation: false },
  { factory: listGoodJobProcesses, groups: ['good_jobs'], isWriteOperation: false },
  { factory: getGoodJobQueueStatistics, groups: ['good_jobs'], isWriteOperation: false },
  { factory: retryGoodJob, groups: ['good_jobs'], isWriteOperation: true },
  { factory: discardGoodJob, groups: ['good_jobs'], isWriteOperation: true },
  { factory: rescheduleGoodJob, groups: ['good_jobs'], isWriteOperation: true },
  { factory: forceTriggerGoodJobCron, groups: ['good_jobs'], isWriteOperation: true },
  { factory: cleanupGoodJobs, groups: ['good_jobs'], isWriteOperation: true },
  // Proctor tools
  { factory: runExamForMirror, groups: ['proctor'], isWriteOperation: true },
  { factory: getExamResult, groups: ['proctor'], isWriteOperation: false },
  { factory: saveResultsForMirror, groups: ['proctor'], isWriteOperation: true },
  { factory: listProctorRuns, groups: ['proctor'], isWriteOperation: false },
  // Discovered URLs tools
  { factory: listDiscoveredUrls, groups: ['discovered_urls'], isWriteOperation: false },
  {
    factory: markDiscoveredUrlProcessed,
    groups: ['discovered_urls'],
    isWriteOperation: true,
  },
  { factory: getDiscoveredUrlStats, groups: ['discovered_urls'], isWriteOperation: false },
];

/**
 * All valid tool groups (base groups and their _readonly variants)
 */
const VALID_TOOL_GROUPS: ToolGroup[] = [
  'newsletter',
  'newsletter_readonly',
  'server_directory',
  'server_directory_readonly',
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
  'redirects',
  'redirects_readonly',
  'good_jobs',
  'good_jobs_readonly',
  'proctor',
  'proctor_readonly',
  'discovered_urls',
  'discovered_urls_readonly',
  'notifications',
];

/**
 * Base groups (without _readonly suffix) - used for default "all groups" behavior
 */
const BASE_TOOL_GROUPS: BaseToolGroup[] = [
  'newsletter',
  'server_directory',
  'official_queue',
  'unofficial_mirrors',
  'official_mirrors',
  'tenants',
  'mcp_jsons',
  'mcp_servers',
  'redirects',
  'good_jobs',
  'proctor',
  'discovered_urls',
  'notifications',
];

/**
 * Parse enabled tool groups from environment variable or parameter
 * @param enabledGroupsParam - Comma-separated list of tool groups (e.g., "newsletter,server_directory_readonly")
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
 * Check if a tool should be included based on enabled groups.
 * A tool is included if ANY of its groups match an enabled group.
 * @param toolDef - The tool definition to check
 * @param enabledGroups - Array of enabled tool groups
 * @returns true if the tool should be included
 */
function shouldIncludeTool(toolDef: ToolDefinition, enabledGroups: ToolGroup[]): boolean {
  for (const baseGroup of toolDef.groups) {
    const readonlyGroup = `${baseGroup}_readonly` as ToolGroup;

    // Check if the base group (full access) is enabled
    if (enabledGroups.includes(baseGroup as ToolGroup)) {
      return true;
    }

    // Check if the readonly group is enabled (only include read operations)
    if (enabledGroups.includes(readonlyGroup) && !toolDef.isWriteOperation) {
      return true;
    }
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
 * (comma-separated list, e.g., "newsletter,server_directory_readonly"). If not set, all
 * base tool groups are enabled by default (full read+write access).
 *
 * Tools can belong to multiple groups. The `server_directory` group is a superset that
 * includes tools from mcp_servers, unofficial_mirrors, official_mirrors, official_queue,
 * and mcp_jsons for comprehensive server directory management.
 *
 * Available tool groups:
 * - newsletter: All newsletter-related tools (read + write)
 * - newsletter_readonly: Newsletter tools (read only)
 * - server_directory: Comprehensive server directory tools including implementations, servers, mirrors, queue, and mcp_jsons (read + write)
 * - server_directory_readonly: Server directory tools (read only)
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
 * - redirects: URL redirect management tools (read + write)
 * - redirects_readonly: URL redirect tools (read only)
 * - good_jobs: GoodJob background job management tools (read + write)
 * - good_jobs_readonly: GoodJob tools (read only)
 * - proctor: Proctor exam execution and result storage tools (read + write)
 * - proctor_readonly: Proctor tools (read only - get_exam_result and list_proctor_runs)
 * - discovered_urls: Discovered URL management tools for processing URLs into MCP implementations (read + write)
 * - discovered_urls_readonly: Discovered URL tools (read only - list and stats)
 * - notifications: Notification email tools - send_impl_posted_notif (write-only, no readonly variant)
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
