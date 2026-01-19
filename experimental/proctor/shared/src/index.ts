// Main exports for the Proctor MCP server shared module
export { createMCPServer, ProctorClient } from './server.js';
export type { IProctorClient, ClientFactory, CreateMCPServerOptions } from './server.js';
export { createRegisterTools, parseEnabledToolGroups } from './tools.js';
export type { ToolGroup } from './tools.js';
export { logServerStart, logError, logWarning, logDebug } from './logging.js';

// Re-export types
export type {
  ProctorRuntime,
  ProctorExam,
  ProctorMetadataResponse,
  ExamLogEntry,
  ExamStreamLog,
  ExamStreamResult,
  ExamStreamError,
  ExamStreamEntry,
  ExamResult,
  RunExamParams,
  FlyMachine,
  MachinesResponse,
  CancelExamParams,
  CancelExamResponse,
  ApiError,
} from './types.js';
