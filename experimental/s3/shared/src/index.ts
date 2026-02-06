// Core server exports
export { registerResources } from './resources.js';
export {
  registerTools,
  createRegisterTools,
  type ToolGroup,
  parseEnabledToolGroups,
  parseToolFilters,
  getAllToolNames,
} from './tools.js';
export {
  createMCPServer,
  type CreateMCPServerOptions,
  type S3ClientFactory,
  type IS3Client,
  type S3ClientConfig,
  AwsS3Client,
} from './server.js';

// S3 client exports
export {
  type ListBucketsResult,
  type ListObjectsOptions,
  type ListObjectsResult,
  type GetObjectResult,
  type PutObjectOptions,
  type PutObjectResult,
  type CopyObjectResult,
} from './s3-client/s3-client.js';
export {
  createIntegrationMockS3Client,
  type MockS3Data,
} from './s3-client/s3-client.integration-mock.js';

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
export { logServerStart, logError, logWarning, logInfo, logDebug } from './logging.js';
