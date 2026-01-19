// Core server exports
export { createRegisterResources } from './resources.js';
export {
  registerTools,
  createRegisterTools,
  type ToolGroup,
  parseEnabledToolGroups,
} from './tools.js';
export {
  createMCPServer,
  type ClientFactory,
  type IAgentOrchestratorClient,
  type CreateMCPServerOptions,
} from './server.js';

// Client exports
export {
  AgentOrchestratorClient,
  type IAgentOrchestratorClient as AgentOrchestratorClientInterface,
} from './orchestrator-client/orchestrator-client.js';

// Health check exports
export {
  checkApiHealth,
  getErrorHint,
  parseHealthCheckTimeout,
  DEFAULT_HEALTH_CHECK_TIMEOUT,
  MAX_HEALTH_CHECK_TIMEOUT,
} from './health-check.js';

// Type exports
export type {
  Session,
  Log,
  SubagentTranscript,
  SessionStatus,
  LogLevel,
  SubagentStatus,
  Pagination,
  SessionsResponse,
  SearchSessionsResponse,
  SessionResponse,
  SessionActionResponse,
  LogsResponse,
  LogResponse,
  SubagentTranscriptsResponse,
  SubagentTranscriptResponse,
  CreateSessionRequest,
  UpdateSessionRequest,
  CreateLogRequest,
  UpdateLogRequest,
  CreateSubagentTranscriptRequest,
  UpdateSubagentTranscriptRequest,
} from './types.js';

// Logging exports (re-exported for convenience)
export { logServerStart, logError, logWarning, logDebug } from './logging.js';
