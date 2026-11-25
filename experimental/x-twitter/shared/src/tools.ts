import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getMyAccountTool } from './tools/get-my-account.js';
import { getUserTool } from './tools/get-user.js';
import { getHomeTimelineTool } from './tools/get-home-timeline.js';
import { getUserTweetsTool } from './tools/get-user-tweets.js';
import { getBookmarksTool } from './tools/get-bookmarks.js';
import { searchRecentTweetsTool } from './tools/search-recent-tweets.js';
import { getTweetsTool } from './tools/get-tweets.js';
import { createBookmarkTool } from './tools/create-bookmark.js';
import { removeBookmarkTool } from './tools/remove-bookmark.js';

/**
 * Generic tool interface.
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
 * Tool groups for this server.
 *
 * - `readonly`: pure reads (account, user lookup, timeline, user tweets,
 *   bookmarks, search, tweet lookup). Cannot change any state.
 * - `readwrite`: everything in `readonly` PLUS bookmark writes
 *   (create_bookmark, remove_bookmark), which mutate only the authenticated
 *   user's PRIVATE bookmark collection.
 *
 * There is deliberately NO group for PUBLIC mutations (post, reply, like,
 * retweet, follow, DM) — this server never exposes such a tool, and the
 * integration test asserts no tool name carries one of those verbs.
 *
 * Select the exposed groups via the `X_TWITTER_ENABLED_TOOLGROUPS` env var
 * (comma-separated). Defaults to all groups.
 */
export type ToolGroup = 'readonly' | 'readwrite';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'readwrite'];

interface ToolDefinition {
  factory: ToolFactory;
  groups: ToolGroup[];
}

/**
 * All tools with their group assignments.
 *
 * readonly: get_my_account, get_user, get_home_timeline, get_user_tweets,
 *   get_bookmarks, search_recent_tweets, get_tweets
 * readwrite: all readonly tools + create_bookmark, remove_bookmark
 */
const ALL_TOOLS: ToolDefinition[] = [
  // Read-only tools (available in every group)
  { factory: getMyAccountTool, groups: ['readonly', 'readwrite'] },
  { factory: getUserTool, groups: ['readonly', 'readwrite'] },
  { factory: getHomeTimelineTool, groups: ['readonly', 'readwrite'] },
  { factory: getUserTweetsTool, groups: ['readonly', 'readwrite'] },
  { factory: getBookmarksTool, groups: ['readonly', 'readwrite'] },
  { factory: searchRecentTweetsTool, groups: ['readonly', 'readwrite'] },
  { factory: getTweetsTool, groups: ['readonly', 'readwrite'] },
  // Private-write tools (bookmarks only) — readwrite group
  { factory: createBookmarkTool, groups: ['readwrite'] },
  { factory: removeBookmarkTool, groups: ['readwrite'] },
];

/**
 * Parses the `X_TWITTER_ENABLED_TOOLGROUPS` environment variable.
 * @param enabledGroupsParam - Comma-separated list of tool groups
 * @returns Array of valid tool groups (defaults to all when unset/invalid)
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
 * Gets all available tool group names.
 */
export function getAvailableToolGroups(): ToolGroup[] {
  return [...ALL_TOOL_GROUPS];
}

/**
 * Creates a function to register tools with the server, filtered by the enabled
 * tool groups.
 */
export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups = enabledGroups || parseEnabledToolGroups(process.env.X_TWITTER_ENABLED_TOOLGROUPS);

  return (server: Server) => {
    const tools = ALL_TOOLS.filter((def) => def.groups.some((g) => groups.includes(g))).map((def) =>
      def.factory(server, clientFactory)
    );

    server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: tools.map((tool) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        })),
      };
    });

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
 * Backward compatibility export — requires a client factory for DI.
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
