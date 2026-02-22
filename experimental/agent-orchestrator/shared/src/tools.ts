import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';

// 13 tools across 4 domains
import { searchSessionsTool } from './tools/search-sessions.js';
import { startSessionTool } from './tools/start-session.js';
import { getSessionTool } from './tools/get-session.js';
import { actionSessionTool } from './tools/action-session.js';
import { getConfigsTool } from './tools/get-configs.js';
import { manageEnqueuedMessagesTool } from './tools/manage-enqueued-messages.js';
import { sendPushNotificationTool } from './tools/send-push-notification.js';
import { getNotificationsTool } from './tools/get-notifications.js';
import { actionNotificationTool } from './tools/action-notification.js';
import { searchTriggersTool } from './tools/search-triggers.js';
import { actionTriggerTool } from './tools/action-trigger.js';
import { getSystemHealthTool } from './tools/get-system-health.js';
import { actionHealthTool } from './tools/action-health.js';
import { getTranscriptArchiveTool } from './tools/get-transcript-archive.js';

// =============================================================================
// TOOL GROUPING SYSTEM
// =============================================================================
// Tool groups allow enabling/disabling categories of tools via environment variables.
// This is useful for permission-based access control or feature flags.
//
// Usage: Set TOOL_GROUPS environment variable to a comma-separated list
// Example: TOOL_GROUPS="sessions_readonly,notifications" (read-only sessions + notifications)
// Default: All groups enabled when not specified
//
// Each group has two variants:
// - Base group (e.g., 'sessions'): Includes all tools (read + write operations)
// - Readonly group (e.g., 'sessions_readonly'): Includes only read operations
//
// Groups:
// - sessions / sessions_readonly: Session management tools (search, get, start, action, configs, enqueued messages)
// - notifications / notifications_readonly: Notification tools (get, send, mark read, dismiss)
// - triggers / triggers_readonly: Automation trigger management (search, create, update, delete, toggle)
// - health / health_readonly: System health monitoring, CLI status, maintenance operations
// =============================================================================

/**
 * Available tool groups for agent-orchestrator.
 * Each domain has a base group (full access) and a _readonly variant (read-only).
 */
export type ToolGroup =
  | 'sessions'
  | 'sessions_readonly'
  | 'notifications'
  | 'notifications_readonly'
  | 'triggers'
  | 'triggers_readonly'
  | 'health'
  | 'health_readonly';

/** Base groups without _readonly suffix */
type BaseToolGroup = 'sessions' | 'notifications' | 'triggers' | 'health';

/**
 * All valid tool groups (base groups and their _readonly variants)
 */
const VALID_TOOL_GROUPS: ToolGroup[] = [
  'sessions',
  'sessions_readonly',
  'notifications',
  'notifications_readonly',
  'triggers',
  'triggers_readonly',
  'health',
  'health_readonly',
];

/**
 * Base groups (without _readonly suffix) - used for default "all groups" behavior
 */
const BASE_TOOL_GROUPS: BaseToolGroup[] = ['sessions', 'notifications', 'triggers', 'health'];

/**
 * Parse enabled tool groups from environment variable or parameter.
 * @param enabledGroupsParam - Comma-separated list of groups (e.g., "sessions,notifications")
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

// =============================================================================
// TOOL DEFINITIONS
// =============================================================================

/**
 * Generic tool interface that all tools must conform to.
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

interface ToolDefinition {
  factory: ToolFactory;
  /** The base group this tool belongs to (without _readonly suffix) */
  group: BaseToolGroup;
  /** If true, this tool is excluded from _readonly groups */
  isWriteOperation: boolean;
}

/**
 * All available tools with their group assignments.
 *
 * 14 tools across 4 domains:
 * - search_sessions: Search/list/get sessions by ID (sessions, read)
 * - get_session: Get detailed session info with optional logs/transcripts (sessions, read)
 * - get_configs: Fetch all static configuration (sessions, read)
 * - get_transcript_archive: Get transcript archive download URL and metadata (sessions, read)
 * - start_session: Create a new session (sessions, write)
 * - action_session: Perform session actions (sessions, write)
 * - manage_enqueued_messages: Manage session message queue (sessions, write)
 * - get_notifications: Get/list notifications and badge count (notifications, read)
 * - send_push_notification: Send a push notification (notifications, write)
 * - action_notification: Mark read, dismiss notifications (notifications, write)
 * - search_triggers: Search/list automation triggers (triggers, read)
 * - action_trigger: Create, update, delete, toggle triggers (triggers, write)
 * - get_system_health: Get system health report and CLI status (health, read)
 * - action_health: System maintenance actions (health, write)
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Session tools - read operations
  { factory: searchSessionsTool, group: 'sessions', isWriteOperation: false },
  { factory: getSessionTool, group: 'sessions', isWriteOperation: false },
  { factory: getConfigsTool, group: 'sessions', isWriteOperation: false },
  { factory: getTranscriptArchiveTool, group: 'sessions', isWriteOperation: false },

  // Session tools - write operations
  { factory: startSessionTool, group: 'sessions', isWriteOperation: true },
  { factory: actionSessionTool, group: 'sessions', isWriteOperation: true },
  { factory: manageEnqueuedMessagesTool, group: 'sessions', isWriteOperation: true },

  // Notification tools - read operations
  { factory: getNotificationsTool, group: 'notifications', isWriteOperation: false },

  // Notification tools - write operations
  { factory: sendPushNotificationTool, group: 'notifications', isWriteOperation: true },
  { factory: actionNotificationTool, group: 'notifications', isWriteOperation: true },

  // Trigger tools - read operations
  { factory: searchTriggersTool, group: 'triggers', isWriteOperation: false },

  // Trigger tools - write operations
  { factory: actionTriggerTool, group: 'triggers', isWriteOperation: true },

  // Health tools - read operations
  { factory: getSystemHealthTool, group: 'health', isWriteOperation: false },

  // Health tools - write operations
  { factory: actionHealthTool, group: 'health', isWriteOperation: true },
];

/**
 * Check if a tool should be included based on enabled groups.
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
 * @param clientFactory - Factory function that creates client instances
 * @param enabledGroups - Optional string of enabled tool groups (defaults to all)
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
