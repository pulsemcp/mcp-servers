import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getMetadata } from './tools/get-metadata.js';
import { runExam } from './tools/run-exam.js';
import { saveResult } from './tools/save-result.js';
import { getPriorResult } from './tools/get-prior-result.js';
import { getMachines } from './tools/get-machines.js';
import { destroyMachine } from './tools/destroy-machine.js';
import { cancelExam } from './tools/cancel-exam.js';

/**
 * Tool group definitions - groups of related tools that can be enabled/disabled together
 *
 * Each group has two variants:
 * - Base group (e.g., 'exams'): Includes all tools (read + write operations)
 * - Readonly group (e.g., 'exams_readonly'): Includes only read operations
 *
 * Groups:
 * - exams / exams_readonly: Exam execution and result management tools
 * - machines / machines_readonly: Fly.io machine management tools
 */
export type ToolGroup = 'exams' | 'exams_readonly' | 'machines' | 'machines_readonly';

/** Base groups without _readonly suffix */
type BaseToolGroup = 'exams' | 'machines';

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
  // Exam tools
  { factory: getMetadata, group: 'exams', isWriteOperation: false },
  { factory: runExam, group: 'exams', isWriteOperation: true },
  { factory: saveResult, group: 'exams', isWriteOperation: true },
  { factory: getPriorResult, group: 'exams', isWriteOperation: false },
  // Machine management tools
  { factory: getMachines, group: 'machines', isWriteOperation: false },
  { factory: destroyMachine, group: 'machines', isWriteOperation: true },
  { factory: cancelExam, group: 'machines', isWriteOperation: true },
];

/**
 * All valid tool groups (base groups and their _readonly variants)
 */
const VALID_TOOL_GROUPS: ToolGroup[] = ['exams', 'exams_readonly', 'machines', 'machines_readonly'];

/**
 * Base groups (without _readonly suffix) - used for default "all groups" behavior
 */
const BASE_TOOL_GROUPS: BaseToolGroup[] = ['exams', 'machines'];

/**
 * Parse enabled tool groups from environment variable or parameter
 * @param enabledGroupsParam - Comma-separated list of tool groups (e.g., "exams,machines_readonly")
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
 * (comma-separated list, e.g., "exams,machines_readonly"). If not set, all
 * base tool groups are enabled by default (full read+write access).
 *
 * Available tool groups:
 * - exams: All exam-related tools (read + write)
 * - exams_readonly: Exam tools (read only - get_proctor_metadata, get_prior_result)
 * - machines: All machine management tools (read + write)
 * - machines_readonly: Machine tools (read only - get_machines)
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
