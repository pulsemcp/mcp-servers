// Main exports for Gmail MCP Server

// Server and client
export {
  createMCPServer,
  createDefaultClient,
  ServiceAccountGmailClient,
  OAuth2GmailClient,
  type IGmailClient,
  type ClientFactory,
  type ServiceAccountCredentials,
  type CreateMCPServerOptions,
  type Draft,
} from './server.js';

// Tools and tool groups
export {
  createRegisterTools,
  registerTools,
  parseEnabledToolGroups,
  getAvailableToolGroups,
  type ToolGroup,
} from './tools.js';

// Logging utilities
export { logServerStart, logError, logWarning, logDebug } from './logging.js';

// Types
export type {
  Email,
  EmailListItem,
  EmailHeader,
  EmailPart,
  Label,
  Thread,
  PaginatedResponse,
} from './types.js';
