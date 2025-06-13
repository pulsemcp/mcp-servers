import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  ExceptionIncident,
  ExceptionIncidentSample,
  LogIncident,
  LogEntry,
} from '../../shared/src/appsignal-client/appsignal-client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Helper to create a TestMCPClient with inline mock definitions for integration tests.
 * This creates a real MCP client that connects to a test server via stdio.
 * Mock data is passed to the server via environment variables.
 *
 * This is different from the functional test mocks which use vitest mocks.
 * Integration tests use real MCP protocol communication with a mocked backend.
 */
export async function createMockedClient(mocks: {
  exceptionIncidents?: Record<string, ExceptionIncident>;
  exceptionIncidentSamples?: Record<string, ExceptionIncidentSample[]>;
  logIncidents?: Record<string, LogIncident>;
  searchResponses?: Record<string, LogEntry[]>;
}) {
  // Create a simplified mock config that can be passed via env
  const mockConfig: any = {
    getExceptionIncident: mocks.exceptionIncidents || {},
    getExceptionIncidentSamples: mocks.exceptionIncidentSamples || {},
    getLogIncident: mocks.logIncidents || {},
    searchLogs: Object.entries(mocks.searchResponses || {}).map(([query, response]) => ({
      query,
      response,
    })),
  };

  const serverPath = path.join(__dirname, '../../local/build/src/index.integration.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      APPSIGNAL_API_KEY: 'test-api-key',
      APPSIGNAL_APP_ID: 'test-app-id',
      APPSIGNAL_MOCK_CONFIG: JSON.stringify(mockConfig),
    },
    debug: false,
  });

  await client.connect();
  return client;
}

/**
 * Example usage in a test:
 *
 * const client = await createMockedClient({
 *   exceptionIncidents: {
 *     'exception-123': {
 *       id: 'exception-123',
 *       name: 'NullPointerException',
 *       message: 'Cannot read property "id" of null',
 *       count: 42,
 *       lastOccurredAt: '2024-01-21T10:00:00Z',
 *       status: 'open'
 *     }
 *   },
 *   searchResponses: {
 *     'error': [{ timestamp: '...', level: 'error', message: '...' }],
 *     'warning': [{ timestamp: '...', level: 'warn', message: '...' }]
 *   }
 * });
 */
