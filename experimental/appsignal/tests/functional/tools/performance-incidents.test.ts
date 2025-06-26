import { vi } from 'vitest';

// Mock the state module - must be before any imports that use it
vi.mock('../../../shared/src/state', () => ({
  setSelectedAppId: vi.fn(),
  getSelectedAppId: vi.fn(),
  clearSelectedAppId: vi.fn(),
  getEffectiveAppId: vi.fn(),
  isAppIdLocked: vi.fn(),
}));

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRegisterTools } from '../../../shared/src/tools';
import { getEffectiveAppId, isAppIdLocked } from '../../../shared/src/state';
import { createMockAppsignalClient } from '../../mocks/appsignal-client.functional-mock';
import type {
  IAppsignalClient,
  PerformanceIncident,
  PerformanceIncidentSample,
  PerformanceIncidentSampleTimeline,
} from '../../../shared/src/appsignal-client/appsignal-client';

interface Tool {
  name: string;
  schema: unknown;
  handler: (args: unknown) => Promise<unknown>;
  enabled: boolean;
}

describe('Performance Incident Tools', () => {
  let mockServer: McpServer;
  let registeredTools: Map<string, Tool>;
  let mockClient: IAppsignalClient;

  // Helper to register tools with a custom mock client
  const registerToolsWithClient = (client: IAppsignalClient) => {
    const registerTools = createRegisterTools(() => client);
    registeredTools.clear();
    registerTools(mockServer);
  };

  beforeEach(() => {
    // Reset environment variables
    process.env.APPSIGNAL_API_KEY = 'test-api-key';
    process.env.APPSIGNAL_APP_ID = 'test-app-id';

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(isAppIdLocked).mockReturnValue(true);
    vi.mocked(getEffectiveAppId).mockReturnValue('test-app-id');

    // Create a mock server that captures tool registrations
    registeredTools = new Map<string, Tool>();
    mockServer = {
      tool: (name: string, description: string, schema: unknown, handler: unknown) => {
        const tool = { name, description, schema, handler, enabled: true };
        registeredTools.set(name, tool);
        return {
          enable: () => {
            tool.enabled = true;
          },
          disable: () => {
            tool.enabled = false;
          },
        };
      },
    } as unknown as McpServer;

    // Create the mock client
    mockClient = createMockAppsignalClient();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('get_performance_incidents', () => {
    it('should retrieve performance incidents with default parameters', async () => {
      // Register tools with the mock client
      registerToolsWithClient(mockClient);

      // Get the tool
      const tool = registeredTools.get('get_performance_incidents');
      expect(tool).toBeDefined();
      expect(tool?.enabled).toBe(true);

      // Call the handler with no arguments
      const result = await tool?.handler({});

      // Parse the result
      const response = JSON.parse((result as any).content[0].text);

      // Verify the response structure
      expect(response).toHaveProperty('incidents');
      expect(response).toHaveProperty('total');
      expect(response).toHaveProperty('hasMore');
      expect(Array.isArray(response.incidents)).toBe(true);
    });

    it('should filter performance incidents by state', async () => {
      const mockPerformanceIncidents: PerformanceIncident[] = [
        {
          id: 'perf-1',
          number: '1',
          state: 'open',
          severity: 'high',
          actionNames: ['Controller#action1'],
          namespace: 'web',
          mean: 100,
          count: 10,
          scopedCount: 8,
          totalDuration: 1000,
          description: 'Test incident 1',
          digests: ['digest1'],
          hasNPlusOne: false,
          hasSamplesInRetention: true,
          createdAt: '2024-01-01T00:00:00Z',
          lastOccurredAt: '2024-01-02T00:00:00Z',
          lastSampleOccurredAt: '2024-01-02T00:00:00Z',
          updatedAt: '2024-01-02T00:00:00Z',
        },
        {
          id: 'perf-2',
          number: '2',
          state: 'closed',
          severity: 'low',
          actionNames: ['Controller#action2'],
          namespace: 'web',
          mean: 50,
          count: 5,
          scopedCount: 5,
          totalDuration: 250,
          description: 'Test incident 2',
          digests: ['digest2'],
          hasNPlusOne: false,
          hasSamplesInRetention: false,
          createdAt: '2024-01-01T00:00:00Z',
          lastOccurredAt: '2024-01-01T00:00:00Z',
          lastSampleOccurredAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
        },
      ];

      // Create a custom mock client that returns specific incidents
      const customMockClient = {
        ...mockClient,
        getPerformanceIncidents: vi.fn(async (states = ['open']) => ({
          incidents: mockPerformanceIncidents.filter((inc) =>
            states.map((s) => s.toLowerCase()).includes(inc.state.toLowerCase())
          ),
          total: mockPerformanceIncidents.filter((inc) =>
            states.map((s) => s.toLowerCase()).includes(inc.state.toLowerCase())
          ).length,
          hasMore: false,
        })),
      } as unknown as IAppsignalClient;

      registerToolsWithClient(customMockClient);

      const tool = registeredTools.get('get_performance_incidents');
      const result = await tool?.handler({ states: ['closed'] });
      const response = JSON.parse((result as any).content[0].text);

      expect(response.incidents).toHaveLength(1);
      expect(response.incidents[0].state).toBe('closed');
      expect(response.total).toBe(1);
    });

    it('should handle errors gracefully', async () => {
      const errorClient = {
        ...mockClient,
        getPerformanceIncidents: vi.fn().mockRejectedValue(new Error('API Error')),
      } as unknown as IAppsignalClient;

      registerToolsWithClient(errorClient);

      const tool = registeredTools.get('get_performance_incidents');
      const result = await tool?.handler({});

      expect((result as any).content[0].text).toContain(
        'Error fetching performance incidents: API Error'
      );
    });

    it('should handle missing app ID', async () => {
      vi.mocked(getEffectiveAppId).mockReturnValue(null);

      registerToolsWithClient(mockClient);

      const tool = registeredTools.get('get_performance_incidents');
      const result = await tool?.handler({});

      expect((result as any).content[0].text).toContain('Error: No app ID configured');
    });
  });

  describe('get_performance_incident', () => {
    it('should retrieve a specific performance incident', async () => {
      const mockIncident: PerformanceIncident = {
        id: 'perf-123',
        number: '42',
        state: 'open',
        severity: 'high',
        actionNames: ['UsersController#show'],
        namespace: 'web',
        mean: 1234.5,
        count: 100,
        scopedCount: 90,
        totalDuration: 123450,
        description: 'Slow database query',
        digests: ['abc123'],
        hasNPlusOne: true,
        hasSamplesInRetention: true,
        createdAt: '2024-01-01T00:00:00Z',
        lastOccurredAt: '2024-01-15T00:00:00Z',
        lastSampleOccurredAt: '2024-01-15T00:00:00Z',
        updatedAt: '2024-01-15T00:00:00Z',
      };

      const customMockClient = {
        ...mockClient,
        getPerformanceIncident: vi.fn(async (id) => {
          if (id === 'perf-123') return mockIncident;
          throw new Error(`Performance incident ${id} not found`);
        }),
      } as unknown as IAppsignalClient;

      registerToolsWithClient(customMockClient);

      const tool = registeredTools.get('get_performance_incident');
      const result = await tool?.handler({ incidentId: 'perf-123' });
      const response = JSON.parse((result as any).content[0].text);

      expect(response).toEqual(mockIncident);
    });

    it('should handle not found errors', async () => {
      const customMockClient = {
        ...mockClient,
        getPerformanceIncident: vi
          .fn()
          .mockRejectedValue(new Error('Performance incident xyz not found')),
      } as unknown as IAppsignalClient;

      registerToolsWithClient(customMockClient);

      const tool = registeredTools.get('get_performance_incident');
      const result = await tool?.handler({ incidentId: 'xyz' });

      expect((result as any).content[0].text).toContain(
        'Error fetching performance incident: Performance incident xyz not found'
      );
    });
  });

  describe('get_performance_incident_sample', () => {
    it('should retrieve a performance incident sample', async () => {
      const mockSample: PerformanceIncidentSample = {
        id: 'sample-789',
        time: '2024-01-15T00:00:00Z',
        action: 'UsersController#show',
        duration: 1523.4,
        queueDuration: 45.2,
        namespace: 'web',
        revision: 'abc123',
        version: '1.0.0',
        originalId: 'req-123',
        originallyRequested: true,
        hasNPlusOne: true,
        timelineTruncatedEvents: 0,
        createdAt: '2024-01-15T00:00:00Z',
        customData: { user_id: '123' },
        params: { id: '42' },
        sessionData: { ip: '127.0.0.1' },
      };

      const customMockClient = {
        ...mockClient,
        getPerformanceIncidentSample: vi.fn(async (id) => {
          if (id === 'perf-123') return mockSample;
          throw new Error(`No sample found for performance incident ${id}`);
        }),
      } as unknown as IAppsignalClient;

      registerToolsWithClient(customMockClient);

      const tool = registeredTools.get('get_performance_incident_sample');
      const result = await tool?.handler({ incidentId: 'perf-123' });
      const response = JSON.parse((result as any).content[0].text);

      expect(response).toEqual(mockSample);
    });
  });

  describe('get_performance_incident_sample_timeline', () => {
    it('should retrieve a performance incident sample timeline', async () => {
      const mockTimeline: PerformanceIncidentSampleTimeline = {
        sampleId: 'sample-789',
        timeline: [
          {
            name: 'process_action.action_controller',
            action: 'UsersController#show',
            digest: 'abc123',
            group: 'action_controller',
            level: 0,
            duration: 1523.4,
            childDuration: 1450.2,
            allocationCount: 15000,
            childAllocationCount: 14500,
            count: 1,
            time: 0,
            end: 1523.4,
            wrapping: false,
            payload: { name: 'UsersController#show' },
          },
          {
            name: 'sql.active_record',
            action: 'User Load',
            digest: 'def456',
            group: 'active_record',
            level: 1,
            duration: 234.5,
            childDuration: 0,
            allocationCount: 500,
            childAllocationCount: 0,
            count: 1,
            time: 45.2,
            end: 279.7,
            wrapping: false,
            payload: { name: 'User Load', body: 'SELECT * FROM users WHERE id = 42' },
          },
        ],
      };

      const customMockClient = {
        ...mockClient,
        getPerformanceIncidentSampleTimeline: vi.fn(async (id) => {
          if (id === 'perf-123') return mockTimeline;
          throw new Error(`No sample found for performance incident ${id}`);
        }),
      } as unknown as IAppsignalClient;

      registerToolsWithClient(customMockClient);

      const tool = registeredTools.get('get_performance_incident_sample_timeline');
      const result = await tool?.handler({ incidentId: 'perf-123' });
      const response = JSON.parse((result as any).content[0].text);

      expect(response).toEqual(mockTimeline);
      expect(response.timeline).toHaveLength(2);
      expect(response.timeline[0].level).toBe(0);
      expect(response.timeline[1].level).toBe(1);
    });
  });
});
