// Core server exports
export {
  registerTools,
  createRegisterTools,
  type ToolGroup,
  parseEnabledToolGroups,
} from './tools.js';
export { createMCPServer, type ClientFactory, type IFlyIOClient, FlyIOClient } from './server.js';

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
