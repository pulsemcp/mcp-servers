import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { createIntegrationMockAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.integration-mock.js';
import type { IAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.js';
import type { MockData } from '../../shared/src/appsignal-client/appsignal-client.integration-mock.js';
import type { TimelineEvent } from '../../shared/src/appsignal-client/lib/performance-incident-sample-timeline.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AppSignal MCP Server Performance Tools Integration', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  describe('Performance Incidents List Tool', () => {
    it('should retrieve performance incidents with default parameters', async () => {
      // Create a mock AppSignal client with performance incidents
      const mockAppSignalClient = createIntegrationMockAppsignalClient({});

      // Create TestMCPClient that will use our mocked AppSignal client
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Call the MCP tool
      const result = await client.callTool('get_perf_incidents', {});

      // Verify the result
      const response = JSON.parse(result.content[0].text);
      expect(response).toHaveProperty('incidents');
      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('hasMore');
      expect(response.incidents).toHaveLength(1);
      expect(response.incidents[0].id).toBe('perf-123');
      expect(response.incidents[0].state).toBe('OPEN');
      expect(response.incidents[0].hasNPlusOne).toBe(true);
    });

    it('should filter performance incidents by state', async () => {
      // Create custom mock data with multiple states
      const mockData: MockData = {
        performanceIncidents: [
          {
            id: 'perf-open',
            number: '1',
            state: 'OPEN',
            severity: 'high',
            actionNames: ['Controller#action1'],
            namespace: 'web',
            mean: 1000,
            count: 100,
            scopedCount: 90,
            totalDuration: 100000,
            description: 'Slow query',
            digests: ['digest1'],
            hasNPlusOne: true,
            hasSamplesInRetention: true,
            createdAt: '2024-01-01T00:00:00Z',
            lastOccurredAt: '2024-01-15T00:00:00Z',
            lastSampleOccurredAt: '2024-01-15T00:00:00Z',
            updatedAt: '2024-01-15T00:00:00Z',
          },
          {
            id: 'perf-closed',
            number: '2',
            state: 'CLOSED',
            severity: 'low',
            actionNames: ['Controller#action2'],
            namespace: 'web',
            mean: 100,
            count: 10,
            scopedCount: 10,
            totalDuration: 1000,
            description: 'Fixed issue',
            digests: ['digest2'],
            hasNPlusOne: false,
            hasSamplesInRetention: false,
            createdAt: '2024-01-01T00:00:00Z',
            lastOccurredAt: '2024-01-10T00:00:00Z',
            lastSampleOccurredAt: '2024-01-10T00:00:00Z',
            updatedAt: '2024-01-10T00:00:00Z',
          },
          {
            id: 'perf-wip',
            number: '3',
            state: 'WIP',
            severity: 'medium',
            actionNames: ['Controller#action3'],
            namespace: 'web',
            mean: 500,
            count: 50,
            scopedCount: 45,
            totalDuration: 25000,
            description: 'Being investigated',
            digests: ['digest3'],
            hasNPlusOne: false,
            hasSamplesInRetention: true,
            createdAt: '2024-01-05T00:00:00Z',
            lastOccurredAt: '2024-01-14T00:00:00Z',
            lastSampleOccurredAt: '2024-01-14T00:00:00Z',
            updatedAt: '2024-01-14T00:00:00Z',
          },
        ],
      };

      const mockAppSignalClient = createIntegrationMockAppsignalClient(mockData);
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      // Test filtering by 'closed' state
      const result = await client.callTool('get_perf_incidents', {
        states: ['CLOSED'],
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.incidents).toHaveLength(1);
      expect(response.incidents[0].state).toBe('CLOSED');
      expect(response.incidents[0].id).toBe('perf-closed');
    });

    it('should handle performance incidents error case', async () => {
      const mockAppSignalClient = createIntegrationMockAppsignalClient({
        errorScenarios: {
          performanceIncidents: 'API rate limit exceeded',
        },
      });

      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incidents', {});

      expect(result.content[0].text).toContain('Error fetching performance incidents');
      expect(result.content[0].text).toContain('API rate limit exceeded');
    });
  });

  describe('Performance Incident Detail Tool', () => {
    it('should retrieve specific performance incident details', async () => {
      const mockAppSignalClient = createIntegrationMockAppsignalClient({});
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incident', {
        incidentNumber: 'perf-123',
      });

      const incident = JSON.parse(result.content[0].text);
      expect(incident.id).toBe('perf-123');
      expect(incident.number).toBe('42');
      expect(incident.state).toBe('OPEN');
      expect(incident.severity).toBe('high');
      expect(incident.hasNPlusOne).toBe(true);
      expect(incident.mean).toBe(1234.5);
      expect(incident.count).toBe(100);
    });

    it('should handle performance incident not found error', async () => {
      const mockAppSignalClient = createIntegrationMockAppsignalClient({});
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incident', {
        incidentNumber: 'non-existent',
      });

      expect(result.content[0].text).toContain('Error fetching performance incident');
      expect(result.content[0].text).toContain('not found');
    });
  });

  describe('Performance Incident Sample Tool', () => {
    it('should retrieve performance incident sample', async () => {
      const mockAppSignalClient = createIntegrationMockAppsignalClient({});
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incident_sample', {
        incidentNumber: 'perf-123',
      });

      const sample = JSON.parse(result.content[0].text);
      expect(sample.id).toBe('sample-789');
      expect(sample.action).toBe('UsersController#show');
      expect(sample.duration).toBe(1523.4);
      expect(sample.queueDuration).toBe(45.2);
      expect(sample.hasNPlusOne).toBe(true);
      expect(sample.customData).toEqual({ user_id: '123' });
      expect(sample.params).toEqual({ id: '42' });
    });

    it('should handle sample not found error', async () => {
      const mockAppSignalClient = createIntegrationMockAppsignalClient({});
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incident_sample', {
        incidentNumber: 'non-existent',
      });

      expect(result.content[0].text).toContain('Error fetching performance incident sample');
      expect(result.content[0].text).toContain('No sample found');
    });
  });

  describe('Performance Incident Sample Timeline Tool', () => {
    it('should retrieve performance incident sample timeline', async () => {
      const mockAppSignalClient = createIntegrationMockAppsignalClient({});
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incident_sample_timeline', {
        incidentNumber: 'perf-123',
      });

      const timeline = JSON.parse(result.content[0].text);
      expect(timeline.sampleId).toBe('sample-789');
      expect(timeline.timeline).toHaveLength(1);
      expect(timeline.timeline[0].name).toBe('process_action.action_controller');
      expect(timeline.timeline[0].action).toBe('UsersController#show');
      expect(timeline.timeline[0].level).toBe(0);
      expect(timeline.timeline[0].duration).toBe(1523.4);
      expect(timeline.timeline[0].allocationCount).toBe(15000);
    });

    it('should show detailed timeline with N+1 queries', async () => {
      const mockData: MockData = {
        performanceTimelineData: {
          'perf-nplusone': {
            sampleId: 'sample-nplusone',
            timeline: [
              {
                name: 'process_action.action_controller',
                action: 'PostsController#index',
                digest: 'root-digest',
                group: 'action_controller',
                level: 0,
                duration: 2500,
                childDuration: 2400,
                allocationCount: 30000,
                childAllocationCount: 28000,
                count: 1,
                time: 0,
                end: 2500,
                wrapping: false,
                payload: { name: 'PostsController#index' },
              },
              {
                name: 'sql.active_record',
                action: 'Post Load',
                digest: 'post-load',
                group: 'active_record',
                level: 1,
                duration: 100,
                childDuration: 0,
                allocationCount: 1000,
                childAllocationCount: 0,
                count: 1,
                time: 50,
                end: 150,
                wrapping: false,
                payload: {
                  name: 'Post Load',
                  body: 'SELECT * FROM posts',
                },
              },
              {
                name: 'sql.active_record',
                action: 'User Load',
                digest: 'user-load',
                group: 'active_record',
                level: 1,
                duration: 50,
                childDuration: 0,
                allocationCount: 500,
                childAllocationCount: 0,
                count: 25, // N+1 query pattern
                time: 200,
                end: 2400,
                wrapping: false,
                payload: {
                  name: 'User Load',
                  body: 'SELECT * FROM users WHERE id = ?',
                },
              },
            ],
          },
        },
      };

      const mockAppSignalClient = createIntegrationMockAppsignalClient(mockData);
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incident_sample_timeline', {
        incidentNumber: 'perf-nplusone',
      });

      const timeline = JSON.parse(result.content[0].text);
      expect(timeline.timeline).toHaveLength(3);

      // Check for N+1 pattern
      const userLoadQuery = timeline.timeline.find((t: TimelineEvent) => t.action === 'User Load');
      expect(userLoadQuery.count).toBe(25); // High count indicates N+1
      expect(userLoadQuery.payload.body).toContain('SELECT * FROM users WHERE id = ?');
    });

    it('should handle timeline not found error', async () => {
      const mockAppSignalClient = createIntegrationMockAppsignalClient({});
      client = await createTestMCPClientWithMock(mockAppSignalClient);

      const result = await client.callTool('get_perf_incident_sample_timeline', {
        incidentNumber: 'non-existent',
      });

      expect(result.content[0].text).toContain(
        'Error fetching performance incident sample timeline'
      );
      expect(result.content[0].text).toContain('No sample found');
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

  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

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
