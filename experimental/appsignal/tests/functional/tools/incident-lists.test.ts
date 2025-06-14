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

    // Create a mock server that captures tool registrations
    registeredTools = new Map();
    mockServer = {
      tool: vi.fn((name, schema, handler) => {
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

      expect(mockClient.getLogIncidents).toHaveBeenCalledWith(undefined, undefined, undefined);
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

      expect(mockClient.getExceptionIncidents).toHaveBeenCalledWith(undefined, 20, 100);
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
});
