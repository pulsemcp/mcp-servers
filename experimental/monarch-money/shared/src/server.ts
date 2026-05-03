import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { buildMonarchClient, IMonarchClient, type MonarchClient } from './monarch-client/client.js';
import { MonarchAuthError } from './monarch-client/graphql-transport.js';
import {
  createFileSessionStore,
  defaultSessionPath,
  type SessionStore,
} from './monarch-client/session-store.js';
import { createRegisterTools } from './tools.js';

export type ClientFactory = () => Promise<IMonarchClient>;

export interface CreateMCPServerOptions {
  version: string;
  /** Override the session store (used by tests). */
  sessionStore?: SessionStore;
  /** Override the API endpoint (used by tests). */
  endpoint?: string;
  /** Override the fetch implementation (used by tests). */
  fetchImpl?: typeof fetch;
}

/**
 * Creates an MCP server instance for Monarch Money.
 *
 * The default client factory loads the encrypted session from disk on each call
 * and constructs a live `MonarchClient`. Tools that don't yet have a session
 * (the auth tools) handle the missing-session case themselves — see
 * `tools/auth.ts`.
 */
export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'mcp-server-monarch-money',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const sessionStore = options.sessionStore ?? createFileSessionStore();

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    const factory: ClientFactory =
      clientFactory ??
      (async () => {
        const session = await sessionStore.load();
        return buildMonarchClient({
          session: session ?? {
            token: '',
            obtainedAt: new Date().toISOString(),
          },
          endpoint: options.endpoint,
          fetchImpl: options.fetchImpl,
          onSessionChange: async (next) => {
            if (next === null) await sessionStore.clear();
            else await sessionStore.save(next);
          },
        });
      });

    const registerTools = createRegisterTools(factory, sessionStore);
    registerTools(server);
  };

  return { server, registerHandlers };
}

export {
  buildMonarchClient,
  MonarchAuthError,
  defaultSessionPath,
  type IMonarchClient,
  type MonarchClient,
  type SessionStore,
};
