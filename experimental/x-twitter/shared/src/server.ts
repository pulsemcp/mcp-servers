import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import { createXClientFromEnv } from './x-client/index.js';
import type { IXClient } from './types.js';

/**
 * OAuth 2.0 scopes this server requests.
 *
 * `bookmark.write` is the ONLY write scope, and it grants access solely to the
 * authenticated user's PRIVATE bookmark collection (create/remove). There is
 * deliberately no `tweet.write`, `like.write`, `follows.write`, or any other
 * scope that would permit a PUBLIC action (posting, replying, liking,
 * retweeting, following, DMing). `offline.access` is required to obtain a
 * refresh token.
 *
 * If you are tempted to add a public-mutation scope: don't. This server exposes
 * reads plus private bookmark writes only, and that guarantee is enforced
 * structurally by never requesting such a scope and never implementing such a
 * tool.
 */
export const X_SCOPES = [
  'tweet.read',
  'users.read',
  'bookmark.read',
  'bookmark.write',
  'offline.access',
] as const;

export type ClientFactory = () => IXClient;

export interface CreateMCPServerOptions {
  version: string;
}

/** Builds the default X client from environment variables. */
export function createDefaultClient(): IXClient {
  return createXClientFromEnv();
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'pulsemcp-x-twitter-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    const baseFactory = clientFactory || createDefaultClient;
    // A single client instance must live for the whole server process. In
    // refresh-token mode the provider caches the ~2h access token and rotates
    // X's SINGLE-USE refresh token in memory; building a fresh client per tool
    // call would discard that state, so every call after the first would retry
    // the already-consumed refresh token and fail with invalid_grant.
    let cachedClient: IXClient | undefined;
    const factory: ClientFactory = () => (cachedClient ??= baseFactory());
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
