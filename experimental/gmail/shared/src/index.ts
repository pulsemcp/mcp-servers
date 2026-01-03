// Main exports for Gmail MCP Server

// Server and client
export { createMCPServer, GmailClient, type IGmailClient, type ClientFactory } from './server.js';

// Tools
export { createRegisterTools, registerTools } from './tools.js';

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
