// Core server exports
export { registerResources } from './resources.js';
export {
  registerTools,
  createRegisterTools,
  parseToolFilterConfig,
  type ToolFilterConfig,
  type ToolGroup,
  type DynamoDBToolName,
} from './tools.js';
export {
  createMCPServer,
  type CreateMCPServerOptions,
  type ClientFactory,
  type IDynamoDBClient,
} from './server.js';

// DynamoDB client exports
export {
  DynamoDBClientImpl,
  type DynamoDBClientConfig,
} from './dynamodb-client/dynamodb-client.js';

// Type exports
export * from './types.js';

// State management exports
export {
  getSelectedResourceId,
  hasSelectedResource,
  isResourceLocked,
  getServerState,
  setSelectedResourceId,
  clearSelectedResource,
  initializeStateFromEnvironment,
  resetState,
} from './state.js';

// Logging exports (re-exported for convenience)
export { logServerStart, logError, logWarning, logDebug } from './logging.js';
