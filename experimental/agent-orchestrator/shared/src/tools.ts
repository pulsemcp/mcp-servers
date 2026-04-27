import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';

// 16 tools across 4 domains + 1 composite group
import { quickSearchSessionsTool } from './tools/search-sessions.js';
import { startSessionTool } from './tools/start-session.js';
import { getSessionTool } from './tools/get-session.js';
import { actionSessionTool, selfSessionActionSessionTool } from './tools/action-session.js';
import { getConfigsTool } from './tools/get-configs.js';
import { manageEnqueuedMessagesTool } from './tools/manage-enqueued-messages.js';
import { sendPushNotificationTool } from './tools/send-push-notification.js';
import { getNotificationsTool } from './tools/get-notifications.js';
import { actionNotificationTool } from './tools/action-notification.js';
import { searchTriggersTool } from './tools/search-triggers.js';
import { actionTriggerTool } from './tools/action-trigger.js';
import { wakeMeUpLaterTool } from './tools/wake-me-up-later.js';
import { wakeMeUpWhenSessionChangesStateTool } from './tools/wake-me-up-when-session-changes-state.js';
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
// Domain groups come in two variants:
// - Base group (e.g., 'sessions'): Includes all tools (read + write operations)
// - Readonly group (e.g., 'sessions_readonly'): Includes only read operations
//
// Domain groups:
// - sessions / sessions_readonly: Session management tools (quick search, get, start, action, configs, enqueued messages)
// - notifications / notifications_readonly: Notification tools (get, send, mark read, dismiss)
// - triggers / triggers_readonly: Automation trigger management (search, create, update, delete, toggle)
// - health / health_readonly: System health monitoring, CLI status, maintenance operations
//
// Composite groups (cross-domain, curated tool sets):
// - self_session: Self-management tools for auto-injected AO servers. Includes get_session,
//   get_configs (read), action_session (filtered: update_notes, update_title, archive),
//   send_push_notification, and wake_me_up_later.
// =============================================================================

/**
 * Available tool groups for agent-orchestrator.
 * - Domain groups: each domain has a base group (full access) and a _readonly variant (read-only)
 * - Composite groups: curated cross-domain tool sets (e.g., self_session)
 */
export type ToolGroup =
  | 'sessions'
  | 'sessions_readonly'
  | 'notifications'
  | 'notifications_readonly'
  | 'triggers'
  | 'triggers_readonly'
  | 'health'
  | 'health_readonly'
  | 'self_session';

/** Base groups without _readonly suffix */
type BaseToolGroup = 'sessions' | 'notifications' | 'triggers' | 'health';

/**
 * All valid tool groups (domain groups, their _readonly variants, and composite groups)
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
  'self_session',
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
  /** Composite groups this tool also belongs to (beyond its primary domain group) */
  compositeGroups?: ToolGroup[];
  /** Alternative factory to use when included via a composite group (overrides default factory) */
  compositeGroupFactoryOverrides?: Partial<Record<ToolGroup, ToolFactory>>;
}

/**
 * All available tools with their group assignments.
 *
 * 16 tools across 4 domains + 1 composite group:
 * - quick_search_sessions: Quick title-based search/list/get sessions by ID (sessions, read)
 * - get_session: Get detailed session info with optional logs/transcripts (sessions, read; self_session)
 * - get_configs: Fetch all static configuration (sessions, read; self_session)
 * - get_transcript_archive: Get transcript archive download URL and metadata (sessions, read)
 * - start_session: Create a new session (sessions, write)
 * - action_session: Perform session actions (sessions, write; self_session: filtered to update_notes, update_title, archive)
 * - manage_enqueued_messages: Manage session message queue (sessions, write)
 * - get_notifications: Get/list notifications and badge count (notifications, read)
 * - send_push_notification: Send a push notification (notifications, write; self_session)
 * - action_notification: Mark read, dismiss notifications (notifications, write)
 * - search_triggers: Search/list automation triggers (triggers, read)
 * - action_trigger: Create, update, delete, toggle triggers (triggers, write)
 * - wake_me_up_later: Schedule a session to be woken up at a specific time (triggers, write; self_session)
 * - wake_me_up_when_session_changes_state: Schedule a session to be woken up when another session enters needs_input or failed (triggers, write; self_session)
 * - get_system_health: Get system health report and CLI status (health, read)
 * - action_health: System maintenance actions (health, write)
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Session tools - read operations
  {
    factory: quickSearchSessionsTool,
    group: 'sessions',
    isWriteOperation: false,
  },
  {
    factory: getSessionTool,
    group: 'sessions',
    isWriteOperation: false,
    compositeGroups: ['self_session'],
  },
  {
    factory: getConfigsTool,
    group: 'sessions',
    isWriteOperation: false,
    compositeGroups: ['self_session'],
  },
  {
    factory: getTranscriptArchiveTool,
    group: 'sessions',
    isWriteOperation: false,
  },

  // Session tools - write operations
  { factory: startSessionTool, group: 'sessions', isWriteOperation: true },
  {
    factory: actionSessionTool,
    group: 'sessions',
    isWriteOperation: true,
    compositeGroups: ['self_session'],
    compositeGroupFactoryOverrides: {
      self_session: selfSessionActionSessionTool,
    },
  },
  {
    factory: manageEnqueuedMessagesTool,
    group: 'sessions',
    isWriteOperation: true,
  },

  // Notification tools - read operations
  {
    factory: getNotificationsTool,
    group: 'notifications',
    isWriteOperation: false,
  },

  // Notification tools - write operations
  {
    factory: sendPushNotificationTool,
    group: 'notifications',
    isWriteOperation: true,
    compositeGroups: ['self_session'],
  },
  {
    factory: actionNotificationTool,
    group: 'notifications',
    isWriteOperation: true,
  },

  // Trigger tools - read operations
  { factory: searchTriggersTool, group: 'triggers', isWriteOperation: false },

  // Trigger tools - write operations
  { factory: actionTriggerTool, group: 'triggers', isWriteOperation: true },
  {
    factory: wakeMeUpLaterTool,
    group: 'triggers',
    isWriteOperation: true,
    compositeGroups: ['self_session'],
  },
  {
    factory: wakeMeUpWhenSessionChangesStateTool,
    group: 'triggers',
    isWriteOperation: true,
    compositeGroups: ['self_session'],
  },

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

  // Check if any composite group that includes this tool is enabled
  if (toolDef.compositeGroups) {
    for (const compositeGroup of toolDef.compositeGroups) {
      if (enabledGroups.includes(compositeGroup)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Determine which factory to use for a tool based on enabled groups.
 * Domain groups (base/readonly) use the default factory. Composite groups
 * may have factory overrides (e.g., restricted action_session for self_session).
 * Domain base group takes precedence over composite group overrides.
 *
 * Priority: base group > readonly group > composite group override > default factory.
 * A write operation with only the readonly group enabled is NOT covered by the
 * domain group — it falls through to composite group override logic.
 */
function getToolFactory(toolDef: ToolDefinition, enabledGroups: ToolGroup[]): ToolFactory {
  const baseGroup = toolDef.group;
  const readonlyGroup = `${baseGroup}_readonly` as ToolGroup;

  // If included via base group (full access), always use the default factory
  if (enabledGroups.includes(baseGroup as ToolGroup)) {
    return toolDef.factory;
  }

  // If included via readonly group AND this is a read operation, use the default factory
  if (enabledGroups.includes(readonlyGroup) && !toolDef.isWriteOperation) {
    return toolDef.factory;
  }

  // Otherwise, the tool is included via a composite group — check for factory overrides
  if (toolDef.compositeGroupFactoryOverrides && toolDef.compositeGroups) {
    for (const compositeGroup of toolDef.compositeGroups) {
      if (
        enabledGroups.includes(compositeGroup) &&
        toolDef.compositeGroupFactoryOverrides[compositeGroup]
      ) {
        return toolDef.compositeGroupFactoryOverrides[compositeGroup]!;
      }
    }
  }

  return toolDef.factory;
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

    // Create tool instances (using factory overrides for composite groups when applicable)
    const tools = enabledTools.map((toolDef) => {
      const factory = getToolFactory(toolDef, enabledToolGroups);
      return factory(server, clientFactory);
    });

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
