import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { ClientFactory } from './server.js';
import { getDocumentTool } from './tools/get-document.js';
import { updateDocumentTool } from './tools/update-document.js';
import { deleteDocumentTool } from './tools/delete-document.js';
import { createDocumentTool } from './tools/create-document.js';
import { appendTextTool } from './tools/append-text.js';
import { insertTextTool } from './tools/insert-text.js';
import { replaceTextTool } from './tools/replace-text.js';
import { getDocumentOutlineTool } from './tools/get-document-outline.js';
import { exportDocumentTool } from './tools/export-document.js';
import { listCommentsTool } from './tools/list-comments.js';
import { shareDocumentTool } from './tools/share-document.js';

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
 * Available tool groups for Google Docs MCP server.
 *
 * - readonly: Pure read operations (get, outline, export, list comments). Cannot modify or share.
 * - readwrite: Read + edit operations on existing documents owned by the auth principal.
 *   Includes create/delete; trashed docs are recoverable from Drive's trash.
 * - readwrite_external: All readwrite operations + sharing with external users via
 *   Drive permissions (the most sensitive operation — grants others access).
 */
export type ToolGroup = 'readonly' | 'readwrite' | 'readwrite_external';

const ALL_TOOL_GROUPS: ToolGroup[] = ['readonly', 'readwrite', 'readwrite_external'];

interface ToolDefinition {
  factory: ToolFactory;
  groups: ToolGroup[];
}

const ALL_TOOLS: ToolDefinition[] = [
  // Read-only tools (available in all groups)
  {
    factory: getDocumentTool,
    groups: ['readonly', 'readwrite', 'readwrite_external'],
  },
  {
    factory: getDocumentOutlineTool,
    groups: ['readonly', 'readwrite', 'readwrite_external'],
  },
  {
    factory: exportDocumentTool,
    groups: ['readonly', 'readwrite', 'readwrite_external'],
  },
  {
    factory: listCommentsTool,
    groups: ['readonly', 'readwrite', 'readwrite_external'],
  },
  // Write tools (readwrite + readwrite_external)
  { factory: createDocumentTool, groups: ['readwrite', 'readwrite_external'] },
  { factory: updateDocumentTool, groups: ['readwrite', 'readwrite_external'] },
  { factory: deleteDocumentTool, groups: ['readwrite', 'readwrite_external'] },
  { factory: appendTextTool, groups: ['readwrite', 'readwrite_external'] },
  { factory: insertTextTool, groups: ['readwrite', 'readwrite_external'] },
  { factory: replaceTextTool, groups: ['readwrite', 'readwrite_external'] },
  // External-facing tools (only in readwrite_external)
  { factory: shareDocumentTool, groups: ['readwrite_external'] },
];

export function parseEnabledToolGroups(enabledGroupsParam?: string): ToolGroup[] {
  if (!enabledGroupsParam) {
    return ALL_TOOL_GROUPS;
  }

  const requestedGroups = enabledGroupsParam
    .split(',')
    .map((g) => g.trim().toLowerCase())
    .filter((g) => g.length > 0);

  const invalidGroups = requestedGroups.filter((g) => !ALL_TOOL_GROUPS.includes(g as ToolGroup));

  if (invalidGroups.length > 0) {
    // Fail closed rather than silently expanding scope: a typo like
    // GOOGLE_DOCS_ENABLED_TOOLGROUPS=readonyl should never end up enabling
    // every tool, including share_document.
    throw new Error(
      `Invalid tool group(s) in GOOGLE_DOCS_ENABLED_TOOLGROUPS: ${invalidGroups.join(', ')}. ` +
        `Valid groups: ${ALL_TOOL_GROUPS.join(', ')}.`
    );
  }

  return requestedGroups as ToolGroup[];
}

export function getAvailableToolGroups(): ToolGroup[] {
  return [...ALL_TOOL_GROUPS];
}

export function createRegisterTools(clientFactory: ClientFactory, enabledGroups?: ToolGroup[]) {
  const groups =
    enabledGroups || parseEnabledToolGroups(process.env.GOOGLE_DOCS_ENABLED_TOOLGROUPS);

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

export function registerTools(server: Server) {
  const factory = () => {
    throw new Error(
      'No client factory provided - use createRegisterTools for dependency injection'
    );
  };
  const register = createRegisterTools(factory);
  register(server);
}
