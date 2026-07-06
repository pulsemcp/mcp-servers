// Main exports for the X (Twitter) MCP Server (read-only).

// Server and client wiring
export {
  createMCPServer,
  createDefaultClient,
  X_SCOPES,
  type ClientFactory,
  type CreateMCPServerOptions,
} from './server.js';

// Tools
export { createRegisterTools, registerTools } from './tools.js';

// X API client layer
export {
  XApiClient,
  RefreshTokenProvider,
  StaticAccessTokenProvider,
  createXClientFromEnv,
  createTokenProviderFromEnv,
  XApiError,
  XAuthError,
  X_API_BASE,
  type ITokenProvider,
  type TokenResponse,
  type XClientEnv,
} from './x-client/index.js';

// Logging
export { logServerStart, logError, logWarning, logInfo } from './logging.js';

// Types
export type {
  IXClient,
  XTweet,
  XUser,
  XListResponse,
  XSingleTweetResponse,
  XSingleUserResponse,
  XTweetsLookupResponse,
  XIncludes,
  XMeta,
  XError,
} from './types.js';
