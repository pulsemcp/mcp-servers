import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createRegisterTools } from './tools.js';
import { TailscaleClient, type ITailscaleClient } from './tailscale-client/tailscale-client.js';

export { TailscaleClient };
export type { ITailscaleClient };

export type ClientFactory = () => ITailscaleClient;

export interface CreateMCPServerOptions {
  version: string;
}

let defaultClient: ITailscaleClient | undefined;

/**
 * Build the default client factory from environment variables.
 *
 * Auth precedence: an explicit `TAILSCALE_API_KEY` wins; otherwise an OAuth
 * client (`TAILSCALE_OAUTH_CLIENT_ID` + `TAILSCALE_OAUTH_CLIENT_SECRET`) is used.
 *
 * The client is memoized so its OAuth access-token cache persists across tool
 * calls — otherwise every call would trigger a fresh token exchange.
 */
function defaultClientFactory(): ITailscaleClient {
  if (defaultClient) {
    return defaultClient;
  }

  const apiKey = process.env.TAILSCALE_API_KEY;
  const oauthClientId = process.env.TAILSCALE_OAUTH_CLIENT_ID;
  const oauthClientSecret = process.env.TAILSCALE_OAUTH_CLIENT_SECRET;
  const tailnet = process.env.TAILSCALE_TAILNET;
  const baseUrl = process.env.TAILSCALE_API_URL;

  if (!apiKey && !(oauthClientId && oauthClientSecret)) {
    throw new Error(
      'Tailscale credentials must be configured: set TAILSCALE_API_KEY, or both ' +
        'TAILSCALE_OAUTH_CLIENT_ID and TAILSCALE_OAUTH_CLIENT_SECRET'
    );
  }

  defaultClient = new TailscaleClient({
    apiKey,
    oauthClientId,
    oauthClientSecret,
    tailnet,
    baseUrl,
  });
  return defaultClient;
}

export function createMCPServer(options: CreateMCPServerOptions) {
  const server = new Server(
    {
      name: 'tailscale-vpn-mcp-server',
      version: options.version,
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  const registerHandlers = async (server: Server, clientFactory?: ClientFactory) => {
    const factory = clientFactory || defaultClientFactory;
    const registerTools = createRegisterTools(factory);
    registerTools(server);
  };

  return { server, registerHandlers };
}
