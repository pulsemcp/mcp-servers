import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import type { ClientFactory } from './server.js';
import type { SessionStore } from './monarch-client/session-store.js';
import { authTools } from './tools/auth.js';
import { accountTools } from './tools/accounts.js';
import { netWorthTools } from './tools/networth.js';
import { transactionReadTools } from './tools/transactions-read.js';
import { transactionWriteTools } from './tools/transactions-write.js';
import { categoryTools } from './tools/categories.js';
import { ruleTools } from './tools/rules.js';
import { budgetTools } from './tools/budgets.js';

export type ToolGroup = 'readonly' | 'manage';

export interface RegisteredTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  groups: ToolGroup[];
  handler: (args: unknown) => Promise<{
    content: { type: 'text'; text: string }[];
    isError?: boolean;
  }>;
}

interface ToolFilterConfig {
  enabledToolGroups?: ToolGroup[];
  enabledTools?: string[];
  disabledTools?: string[];
}

function parseList(value: string | undefined): string[] | undefined {
  if (!value) return undefined;
  const items = value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

function parseGroups(value: string | undefined): ToolGroup[] | undefined {
  const items = parseList(value);
  if (!items) return undefined;
  const valid = new Set<ToolGroup>(['readonly', 'manage']);
  return items.filter((g): g is ToolGroup => valid.has(g as ToolGroup));
}

export function readToolFilterConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env
): ToolFilterConfig {
  return {
    enabledToolGroups: parseGroups(env.MONARCH_ENABLED_TOOL_GROUPS),
    enabledTools: parseList(env.MONARCH_ENABLED_TOOLS),
    disabledTools: parseList(env.MONARCH_DISABLED_TOOLS),
  };
}

export function filterTools(tools: RegisteredTool[], config: ToolFilterConfig): RegisteredTool[] {
  if (config.enabledTools?.length) {
    const allow = new Set(config.enabledTools);
    return tools.filter((t) => allow.has(t.name));
  }
  let filtered = tools;
  if (config.enabledToolGroups?.length) {
    const allow = new Set(config.enabledToolGroups);
    filtered = filtered.filter((t) => t.groups.some((g) => allow.has(g)));
  }
  if (config.disabledTools?.length) {
    const block = new Set(config.disabledTools);
    filtered = filtered.filter((t) => !block.has(t.name));
  }
  return filtered;
}

export function createRegisterTools(clientFactory: ClientFactory, sessionStore: SessionStore) {
  return (server: Server) => {
    const allTools: RegisteredTool[] = [
      ...authTools(clientFactory, sessionStore),
      ...accountTools(clientFactory),
      ...netWorthTools(clientFactory),
      ...transactionReadTools(clientFactory),
      ...transactionWriteTools(clientFactory),
      ...categoryTools(clientFactory),
      ...ruleTools(clientFactory),
      ...budgetTools(clientFactory),
    ];

    const tools = filterTools(allTools, readToolFilterConfigFromEnv());

    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: tools.map((t) => ({
        name: t.name,
        description: t.description,
        inputSchema: t.inputSchema,
      })),
    }));

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const tool = tools.find((t) => t.name === name);
      if (!tool) throw new Error(`Unknown tool: ${name}`);
      return await tool.handler(args);
    });
  };
}
