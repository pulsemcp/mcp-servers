import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import { createIntegrationMockAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.integration-mock.js';
import type { IAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.js';
import type { MockData } from '../../shared/src/appsignal-client/appsignal-client.integration-mock.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AppSignal MCP Server New Tools Integration', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Anomaly Incident Tools', () => {
    it('should retrieve anomaly incident details (happy path)', async () => {
      // Create a mock AppSignal client with custom anomaly incident data
      const mockAppSignalClient = createIntegrationMockAppsignalClient({
        anomalyIncidents: {
          'cpu-spike': {
            id: 'cpu-spike',
            number: 789,
            summary: 'High CPU Usage Alert',
            description: 'CPU usage exceeded 95% for 5 minutes',
            state: 'open',
            count: 15,
            createdAt: '2024-01-21T14:00:00Z',
            lastOccurredAt: '2024-01-21T15:30:00Z',
            updatedAt: '2024-01-21T15:30:00Z',
            digests: ['cpu-digest-1', 'cpu-digest-2'],
            alertState: 'OPEN',
            trigger: {
              id: 'cpu-trigger',
              name: 'CPU Usage Monitor',
              description: 'Monitors high CPU usage',
            },
            tags: [
              { key: 'server', value: 'web-server-01' },
              { key: 'severity', value: 'critical' },
            ],
          },
        },
      });

      // Create TestMCPClient that will use our mocked AppSignal client
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Call the MCP tool
      const result = await client.callTool('get_anomaly_incident', {
        incidentNumber: 'cpu-spike',
      });

      // Verify the result
      const incident = JSON.parse(result.content[0].text);
      expect(incident.id).toBe('cpu-spike');
      expect(incident.summary).toBe('High CPU Usage Alert');
      expect(incident.state).toBe('open');
      expect(incident.count).toBe(15);
      expect(incident.tags).toContainEqual({ key: 'server', value: 'web-server-01' });
    });

    it('should handle anomaly incident error case', async () => {
      // Create a mock AppSignal client that will simulate an error
      const mockAppSignalClient = createIntegrationMockAppsignalClient({
        errorScenarios: {
          anomalyIncident: {
            'network-error': 'Connection reset by peer',
          },
        },
      });

      // Create TestMCPClient that will use our mocked AppSignal client
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Call the MCP tool with the error-triggering ID
      const result = await client.callTool('get_anomaly_incident', {
        incidentNumber: 'network-error',
      });

      // Verify error handling
      expect(result.content[0].text).toContain('Error fetching anomaly incident details');
      expect(result.content[0].text).toContain('Connection reset by peer');
    });
  });

  describe('Incident List Tools', () => {
    it('should retrieve log incidents list with state filter', async () => {
      // Create a mock AppSignal client with custom log incidents list
      const mockAppSignalClient = createIntegrationMockAppsignalClient({
        logIncidentLists: {
          incidents: [
            {
              id: 'log-inc-1',
              number: 201,
              summary: 'Database Connection Failures',
              description: 'Multiple DB connection timeouts',
              severity: 'ERROR',
              state: 'open',
              count: 45,
              lastOccurredAt: '2024-01-21T16:00:00Z',
              trigger: {
                id: 'db-trigger',
                name: 'DB Error Monitor',
                query: 'level:error db',
                severities: ['ERROR', 'FATAL'],
                sourceIds: ['db-server-01'],
              },
            },
            {
              id: 'log-inc-2',
              number: 202,
              summary: 'API Rate Limit Warnings',
              severity: 'WARN',
              state: 'closed',
              count: 120,
              lastOccurredAt: '2024-01-21T15:00:00Z',
              trigger: {
                id: 'api-trigger',
                name: 'API Rate Monitor',
                query: 'rate limit',
                severities: ['WARN'],
                sourceIds: ['api-server-01'],
              },
            },
          ],
          total: 2,
          hasMore: false,
        },
      });

      // Create TestMCPClient that will use our mocked AppSignal client
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Call the MCP tool
      const result = await client.callTool('get_log_incidents', {
        states: ['OPEN', 'CLOSED'],
        limit: 50,
        offset: 0,
      });

      // Verify the results
      const response = JSON.parse(result.content[0].text);
      expect(response.incidents).toHaveLength(2);
      expect(response.incidents[0].summary).toBe('Database Connection Failures');
      expect(response.incidents[1].state).toBe('closed');
      expect(response.total).toBe(2);
      expect(response.hasMore).toBe(false);
    });

    it('should retrieve exception incidents list with pagination', async () => {
      // Create a mock AppSignal client with paginated results
      const mockAppSignalClient = createIntegrationMockAppsignalClient({
        exceptionIncidentLists: {
          incidents: [
            {
              id: 'exc-page-1',
              name: 'PagedException1',
              message: 'First page exception',
              count: 10,
              lastOccurredAt: '2024-01-21T16:00:00Z',
              status: 'open',
            },
            {
              id: 'exc-page-2',
              name: 'PagedException2',
              message: 'Second exception',
              count: 8,
              lastOccurredAt: '2024-01-21T15:50:00Z',
              status: 'open',
            },
          ],
          total: 150,
          hasMore: true,
        },
      });

      // Create TestMCPClient that will use our mocked AppSignal client
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Call the MCP tool with pagination
      const result = await client.callTool('get_exception_incidents', {
        states: ['OPEN'],
        limit: 2,
        offset: 20,
      });

      // Verify pagination results
      const response = JSON.parse(result.content[0].text);
      expect(response.incidents).toHaveLength(2);
      expect(response.total).toBe(150);
      expect(response.hasMore).toBe(true);
    });

    it('should retrieve anomaly incidents list with WIP state', async () => {
      // Create a mock AppSignal client with WIP anomaly incidents
      const mockAppSignalClient = createIntegrationMockAppsignalClient({
        anomalyIncidentLists: {
          incidents: [
            {
              id: 'wip-anomaly-1',
              number: 301,
              summary: 'Memory Usage Investigation',
              state: 'wip',
              count: 7,
              lastOccurredAt: '2024-01-21T14:00:00Z',
              alertState: 'WARMUP',
            },
          ],
          total: 1,
          hasMore: false,
        },
      });

      // Create TestMCPClient that will use our mocked AppSignal client
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Call the MCP tool
      const result = await client.callTool('get_anomaly_incidents', {
        states: ['WIP'],
        limit: 10,
      });

      // Verify WIP results
      const response = JSON.parse(result.content[0].text);
      expect(response.incidents).toHaveLength(1);
      expect(response.incidents[0].state).toBe('wip');
      expect(response.incidents[0].summary).toContain('Investigation');
    });

    it('should handle incident list error scenarios', async () => {
      // Create a mock AppSignal client that simulates errors
      const mockAppSignalClient = createIntegrationMockAppsignalClient({
        errorScenarios: {
          logIncidents: 'API rate limit exceeded',
          exceptionIncidents: 'Authentication failed',
          anomalyIncidents: 'Service unavailable',
        },
      });

      // Create TestMCPClient that will use our mocked AppSignal client
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Test log incidents error
      const logResult = await client.callTool('get_log_incidents', {});
      expect(logResult.content[0].text).toContain('Error fetching log incidents');
      expect(logResult.content[0].text).toContain('API rate limit exceeded');

      // Test exception incidents error
      const excResult = await client.callTool('get_exception_incidents', {});
      expect(excResult.content[0].text).toContain('Error fetching exception incidents');
      expect(excResult.content[0].text).toContain('Authentication failed');

      // Test anomaly incidents error
      const anomalyResult = await client.callTool('get_anomaly_incidents', {});
      expect(anomalyResult.content[0].text).toContain('Error fetching anomaly incidents');
      expect(anomalyResult.content[0].text).toContain('Service unavailable');
    });
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked AppSignal client.
 * This demonstrates how we're mocking the AppSignal API calls, not the MCP client.
 */
async function createTestMCPClientWithMock(
  mockAppSignalClient: IAppsignalClient & { mockData?: MockData }
): Promise<TestMCPClient> {
  // We need to pass the mock to the server somehow.
  // Since we can't inject it directly, we'll use environment variables
  // to tell the server to use our mock data.
  const mockData = mockAppSignalClient.mockData || {};

  // Support testing against both local and published builds
  const buildType = process.env.MCP_TEST_BUILD_TYPE || 'local';
  const serverPath =
    buildType === 'published'
      ? path.join(__dirname, '../../published-build/build/index.integration-with-mock.js')
      : path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      APPSIGNAL_API_KEY: 'test-api-key',
      APPSIGNAL_APP_ID: 'test-app-id',
      APPSIGNAL_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
