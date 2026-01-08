// Core server exports
export { registerResources } from './resources.js';
export {
  registerTools,
  createRegisterTools,
  type ToolGroup,
  parseEnabledToolGroups,
} from './tools.js';
export {
  createMCPServer,
  createSSHConfigFromEnv,
  type ClientFactory,
  type ISSHClient,
  type SSHConfig,
  type CommandResult,
  type DirectoryEntry,
  SSHClient,
} from './server.js';

// SSH client mock for testing
export {
  createIntegrationMockSSHClient,
  MockSSHClient,
  type MockSSHData,
} from './ssh-client/ssh-client.integration-mock.js';

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
