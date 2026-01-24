// Core server exports
export {
  registerTools,
  createRegisterTools,
  type ToolGroup,
  type RegisterToolsOptions,
  type DockerClientFactory,
  parseEnabledToolGroups,
  validateToolGroupConfig,
  DOCKER_REQUIRED_FEATURE_GROUPS,
} from './tools.js';
export {
  createMCPServer,
  type CreateMCPServerOptions,
  type ClientFactory,
  type IFlyIOClient,
  FlyIOClient,
} from './server.js';

// Docker client exports
export { DockerCLIClient, type RegistryImage } from './docker-client/docker-cli-client.js';

// Logging exports (re-exported for convenience)
export { logServerStart, logError, logWarning, logDebug } from './logging.js';

// Type exports
export type {
  App,
  Machine,
  MachineConfig,
  GuestConfig,
  CreateAppRequest,
  CreateMachineRequest,
  UpdateMachineRequest,
} from './types.js';
