export {
  createMCPServer,
  type ClientFactory,
  type CreateMCPServerOptions,
  buildMonarchClient,
  MonarchAuthError,
  defaultSessionPath,
  type IMonarchClient,
  type MonarchClient,
  type SessionStore,
} from './server.js';

export {
  createGraphQLTransport,
  MonarchGraphQLError,
  type GraphQLTransport,
} from './monarch-client/graphql-transport.js';

export {
  createFileSessionStore,
  createMemorySessionStore,
  defaultStateDir,
} from './monarch-client/session-store.js';

export {
  generateDeviceUuid,
  login,
  MonarchEmailOtpRequiredError,
  MonarchTotpRequiredError,
  MonarchLoginRejectedError,
  type LoginInput,
  type LoginResult,
} from './monarch-client/auth.js';

export { resolveSession, type AutoAuthOptions } from './auto-auth.js';

export * from './types.js';
