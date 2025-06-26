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
import type { IAppsignalClient } from '../../../shared/src/appsignal-client/appsignal-client';

interface Tool {
  name: string;
  schema: unknown;
  handler: (args: unknown) => Promise<unknown>;
  enabled: boolean;
}

describe('Incident List Tools', () => {
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

  describe('get_log_incidents', () => {
    it('should fetch log incidents list successfully', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'log-1',
            number: 101,
            summary: 'Database connection errors',
            description: 'Multiple failed DB connections',
            severity: 'error',
            state: 'open',
            count: 25,
            createdAt: '2023-12-01T08:00:00Z',
            lastOccurredAt: '2023-12-01T10:00:00Z',
            trigger: {
              id: 'trigger-1',
              name: 'DB Error Monitor',
              query: 'level:error source:database',
              severities: ['error', 'fatal'],
              sourceIds: ['app-server-1'],
            },
          },
          {
            id: 'log-2',
            number: 102,
            summary: 'Warning: High memory usage',
            severity: 'warn',
            state: 'closed',
            count: 10,
            lastOccurredAt: '2023-12-01T09:00:00Z',
            trigger: {
              id: 'trigger-2',
              name: 'Memory Warning',
              query: 'level:warn memory',
              severities: ['warn'],
              sourceIds: ['app-server-2'],
            },
          },
        ],
        total: 2,
        hasMore: false,
      };

      mockClient.getLogIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_log_incidents');
      const result = await tool.handler({ states: ['OPEN', 'CLOSED'], limit: 50, offset: 0 });

      expect(mockClient.getLogIncidents).toHaveBeenCalledWith(['OPEN', 'CLOSED'], 50, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual(mockResult);
    });

    it('should use default state filter when not provided', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'log-1',
            number: 101,
            summary: 'Database connection errors',
            state: 'open',
            count: 25,
            lastOccurredAt: '2023-12-01T10:00:00Z',
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockClient.getLogIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_log_incidents');
      const result = await tool.handler({});

      expect(mockClient.getLogIncidents).toHaveBeenCalledWith(['OPEN'], 50, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response.incidents).toHaveLength(1);
      expect(response.incidents[0].state).toBe('open');
    });

    it('should handle API errors', async () => {
      mockClient.getLogIncidents = vi.fn().mockRejectedValue(new Error('GraphQL request failed'));

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_log_incidents');
      const result = await tool.handler({ states: ['OPEN'] });

      expect(result.content[0].text).toContain(
        'Error fetching log incidents: GraphQL request failed'
      );
    });
  });

  describe('get_exception_incidents', () => {
    it('should fetch exception incidents list successfully', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'exc-1',
            name: 'NullPointerException',
            message: 'Cannot read property x of null',
            count: 42,
            lastOccurredAt: '2023-12-01T10:00:00Z',
            status: 'open' as const,
          },
          {
            id: 'exc-2',
            name: 'TypeError',
            message: 'x is not a function',
            count: 15,
            lastOccurredAt: '2023-12-01T09:30:00Z',
            status: 'resolved' as const,
          },
        ],
        total: 2,
        hasMore: false,
      };

      mockClient.getExceptionIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_exception_incidents');
      const result = await tool.handler({ states: ['OPEN', 'CLOSED'], limit: 50, offset: 0 });

      expect(mockClient.getExceptionIncidents).toHaveBeenCalledWith(['OPEN', 'CLOSED'], 50, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual(mockResult);
    });

    it('should filter by WIP state', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'exc-3',
            name: 'WorkInProgressError',
            message: 'Feature under development',
            count: 5,
            lastOccurredAt: '2023-12-01T10:30:00Z',
            status: 'muted' as const,
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockClient.getExceptionIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_exception_incidents');
      const result = await tool.handler({ states: ['WIP'], limit: 10, offset: 0 });

      expect(mockClient.getExceptionIncidents).toHaveBeenCalledWith(['WIP'], 10, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response.incidents).toHaveLength(1);
    });

    it('should handle pagination', async () => {
      const mockResult = {
        incidents: [],
        total: 200,
        hasMore: true,
      };

      mockClient.getExceptionIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_exception_incidents');
      const result = await tool.handler({ limit: 20, offset: 100 });

      expect(mockClient.getExceptionIncidents).toHaveBeenCalledWith(['OPEN'], 20, 100);
      const response = JSON.parse(result.content[0].text);
      expect(response.hasMore).toBe(true);
      expect(response.total).toBe(200);
    });

    it('should handle API errors', async () => {
      mockClient.getExceptionIncidents = vi
        .fn()
        .mockRejectedValue(new Error('API rate limit exceeded'));

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_exception_incidents');
      const result = await tool.handler({ states: ['OPEN'] });

      expect(result.content[0].text).toContain(
        'Error fetching exception incidents: API rate limit exceeded'
      );
    });
  });

  describe('get_anomaly_incidents', () => {
    it('should fetch anomaly incidents list successfully', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'anomaly-1',
            number: 201,
            description: 'High CPU usage spike',
            state: 'open',
            count: 8,
            createdAt: '2023-12-01T11:00:00Z',
            lastOccurredAt: '2023-12-01T11:30:00Z',
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
        ],
        total: 1,
        hasMore: false,
      };

      mockClient.getAnomalyIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');
      const result = await tool.handler({ states: ['OPEN'], limit: 50, offset: 0 });

      expect(mockClient.getAnomalyIncidents).toHaveBeenCalledWith(['OPEN'], 50, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual(mockResult);
    });

    it('should use default parameters when none provided', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'anomaly-2',
            number: 202,
            description: 'Memory usage anomaly',
            state: 'open',
            count: 3,
            createdAt: '2023-12-01T12:00:00Z',
            lastOccurredAt: '2023-12-01T12:15:00Z',
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockClient.getAnomalyIncidents = vi.fn().mockResolvedValue(mockResult);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');

      // Call with empty parameters object - should use defaults
      const result = await tool.handler({});

      // Should be called with default values: states=['OPEN'], limit=50, offset=0
      expect(mockClient.getAnomalyIncidents).toHaveBeenCalledWith(['OPEN'], 50, 0);
      const response = JSON.parse(result.content[0].text);
      expect(response).toEqual(mockResult);
    });

    it('should handle all parameter scenarios equivalently', async () => {
      const mockResult = {
        incidents: [
          {
            id: 'anomaly-equiv',
            number: 203,
            description: 'Equivalent test incident',
            state: 'open',
            count: 1,
          },
        ],
        total: 1,
        hasMore: false,
      };

      mockClient.getAnomalyIncidents = vi.fn().mockResolvedValue(mockResult);
      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');

      // Test 1: Empty object {}
      await tool.handler({});
      expect(mockClient.getAnomalyIncidents).toHaveBeenLastCalledWith(['OPEN'], 50, 0);

      // Test 2: Undefined argument
      await tool.handler(undefined);
      expect(mockClient.getAnomalyIncidents).toHaveBeenLastCalledWith(['OPEN'], 50, 0);

      // Test 3: Null argument (should also work)
      await tool.handler(null);
      expect(mockClient.getAnomalyIncidents).toHaveBeenLastCalledWith(['OPEN'], 50, 0);

      // All calls should have used the same default parameters
      expect(mockClient.getAnomalyIncidents).toHaveBeenCalledTimes(3);
      mockClient.getAnomalyIncidents.mock.calls.forEach((call) => {
        expect(call).toEqual([['OPEN'], 50, 0]);
      });
    });

    it('should handle API errors', async () => {
      mockClient.getAnomalyIncidents = vi
        .fn()
        .mockRejectedValue(new Error('Service temporarily unavailable'));

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_anomaly_incidents');
      const result = await tool.handler({ states: ['OPEN'] });

      expect(result.content[0].text).toContain(
        'Error fetching anomaly incidents: Service temporarily unavailable'
      );
    });
  });
});
