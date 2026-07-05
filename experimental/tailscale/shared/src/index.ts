// Main exports for the Tailscale MCP server shared module
export { createMCPServer, TailscaleClient } from './server.js';
export type { ITailscaleClient, ClientFactory, CreateMCPServerOptions } from './server.js';
export { createRegisterTools, parseEnabledToolGroups } from './tools.js';
export type { ToolGroup } from './tools.js';
export { logServerStart, logError, logWarning, logDebug } from './logging.js';

// Re-export types
export type {
  Device,
  DevicesResponse,
  DeviceRoutes,
  PolicyFile,
  PolicyValidationResult,
  KeyCapabilities,
  Key,
  KeysResponse,
  CreateKeyParams,
  ApiError,
} from './types.js';
