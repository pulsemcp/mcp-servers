import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRegisterTools } from '../../../shared/src/tools';
import { createMockAppsignalClient } from '../../mocks/appsignal-client.functional-mock';
import type { IAppsignalClient } from '../../../shared/src/appsignal-client/appsignal-client';

// Mock the state module
vi.mock('../../../shared/src/state', () => ({
  setSelectedAppId: vi.fn(),
  getSelectedAppId: vi.fn(),
}));

interface Tool {
  name: string;
  schema: unknown;
  handler: (args: unknown) => Promise<unknown>;
  enabled: boolean;
}

describe('Anomaly Incident Tools', () => {
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

    // Create a mock server that captures tool registrations
    registeredTools = new Map();
    mockServer = {
      tool: vi.fn((...args) => {
        // Handle both 3 and 4 parameter versions
        let name, schema, handler;
        if (args.length === 3) {
          [name, schema, handler] = args;
        } else if (args.length === 4) {
          [name, , schema, handler] = args; // Skip description
        }
        const tool = { name, schema, handler, enabled: true };
        registeredTools.set(name, tool);
        return {
          enable: () => {
            tool.enabled = true;
          },
          disable: () => {
            tool.enabled = false;
          },
        };
      }),
    } as unknown as McpServer;

    // Create default mock client
    mockClient = createMockAppsignalClient();
  });

  afterEach(() => {
    delete process.env.APPSIGNAL_API_KEY;
    delete process.env.APPSIGNAL_APP_ID;
  });

  describe('get_anomaly_incident', () => {
    it('should fetch anomaly incident successfully', async () => {
      const mockIncident = {
        id: 'anomaly-123',
        number: 45,
        summary: 'High CPU usage detected',
        description: 'CPU usage exceeded 90% threshold',
        state: 'open' as const,
        count: 12,
        createdAt: '2023-12-01T08:00:00Z',
        lastOccurredAt: '2023-12-01T10:00:00Z',
        updatedAt: '2023-12-01T10:00:00Z',
        digests: ['digest1', 'digest2'],
        alertState: 'OPEN',
        trigger: {
          id: 'trigger-123',
          name: 'CPU Monitor',
          description: 'Monitors CPU usage',
        },
        tags: [
          { key: 'environment', value: 'production' },
          { key: 'severity', value: 'high' },
        ],
      };

      mockClient.getAnomalyIncident = vi.fn().mockResolvedValue(mockIncident);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incident');
      const result = await tool.handler({ incidentId: 'anomaly-123' });

      expect(mockClient.getAnomalyIncident).toHaveBeenCalledWith('anomaly-123');
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual(mockIncident);
    });

    it('should handle anomaly incident not found', async () => {
      mockClient.getAnomalyIncident = vi
        .fn()
        .mockRejectedValue(new Error('Anomaly incident with ID anomaly-999 not found'));

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incident');
      const result = await tool.handler({ incidentId: 'anomaly-999' });

      expect(result.content[0].text).toContain(
        'Error fetching anomaly incident details: Anomaly incident with ID anomaly-999 not found'
      );
    });

    it('should handle network errors', async () => {
      mockClient.getAnomalyIncident = vi.fn().mockRejectedValue(new Error('Network timeout'));

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incident');
      const result = await tool.handler({ incidentId: 'anomaly-123' });

      expect(result.content[0].text).toContain(
        'Error fetching anomaly incident details: Network timeout'
      );
    });
  });

  describe('get_anomaly_incidents', () => {
    it('should fetch anomaly incidents list successfully', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'anomaly-1',
            number: 1,
            summary: 'Memory spike',
            state: 'open' as const,
            count: 5,
            lastOccurredAt: '2023-12-01T10:00:00Z',
          },
          {
            id: 'anomaly-2',
            number: 2,
            summary: 'Disk usage warning',
            state: 'closed' as const,
            count: 3,
            lastOccurredAt: '2023-12-01T09:00:00Z',
          },
        ],
        total: 2,
        hasMore: false,
      };

      mockClient.getAnomalyIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');
      const result = await tool.handler({ states: ['OPEN', 'CLOSED'], limit: 50, offset: 0 });

      expect(mockClient.getAnomalyIncidents).toHaveBeenCalledWith(['OPEN', 'CLOSED'], 50, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual(mockResult);
    });

    it('should use default state filter when not provided', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'anomaly-1',
            number: 1,
            summary: 'Memory spike',
            state: 'open' as const,
            count: 5,
            lastOccurredAt: '2023-12-01T10:00:00Z',
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockClient.getAnomalyIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');
      const result = await tool.handler({});

      expect(mockClient.getAnomalyIncidents).toHaveBeenCalledWith(['OPEN'], 50, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response.incidents).toHaveLength(1);
      expect(response.incidents[0].state).toBe('open');
    });

    it('should handle pagination parameters', async () => {
      const mockResult = {
        incidents: [],
        total: 100,
        hasMore: true,
      };

      mockClient.getAnomalyIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');
      const result = await tool.handler({ states: ['WIP'], limit: 10, offset: 20 });

      expect(mockClient.getAnomalyIncidents).toHaveBeenCalledWith(['WIP'], 10, 20);
      const response = JSON.parse(result.content[0].text);
      expect(response.hasMore).toBe(true);
    });

    it('should handle API errors', async () => {
      mockClient.getAnomalyIncidents = vi
        .fn()
        .mockRejectedValue(new Error('GraphQL request failed'));

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');
      const result = await tool.handler({ states: ['OPEN'] });

      expect(result.content[0].text).toContain(
        'Error fetching anomaly incidents: GraphQL request failed'
      );
    });
  });
});
