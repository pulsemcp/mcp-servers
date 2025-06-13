import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools, createRegisterTools } from '../../shared/src/tools';
import { getSelectedAppId } from '../../shared/src/state';
import { createMockAppsignalClient } from '../mocks/appsignal-client.functional-mock';
import type { IAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client';

// Mock the state module
vi.mock('../../shared/src/state', () => ({
  setSelectedAppId: vi.fn(),
  getSelectedAppId: vi.fn(),
}));

interface Tool {
  name: string;
  schema: unknown;
  handler: (args: unknown) => Promise<unknown>;
  enabled: boolean;
}

describe('AppSignal MCP Tools', () => {
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

  describe('Tool Registration', () => {
    it('should register all tools when API key is provided', () => {
      registerTools(mockServer);

      expect(mockServer.tool).toHaveBeenCalledTimes(6);
      expect(registeredTools.has('get_apps')).toBe(true);
      expect(registeredTools.has('select_app_id')).toBe(true);
      expect(registeredTools.has('get_exception_incident')).toBe(true);
      expect(registeredTools.has('get_exception_incident_sample')).toBe(true);
      expect(registeredTools.has('get_log_incident')).toBe(true);
      expect(registeredTools.has('search_logs')).toBe(true);
    });

    it('should throw error when API key is missing', () => {
      delete process.env.APPSIGNAL_API_KEY;

      expect(() => registerTools(mockServer)).toThrow(
        'APPSIGNAL_API_KEY environment variable must be configured'
      );
    });

    it('should disable main tools when no app ID is provided', () => {
      delete process.env.APPSIGNAL_APP_ID;
      vi.mocked(getSelectedAppId).mockReturnValue(undefined);
      const registerTools = createRegisterTools(() => createMockAppsignalClient());

      registerTools(mockServer);

      // Check that main tools are disabled
      expect(registeredTools.get('get_exception_incident').enabled).toBe(false);
      expect(registeredTools.get('get_exception_incident_sample').enabled).toBe(false);
      expect(registeredTools.get('get_log_incident').enabled).toBe(false);
      expect(registeredTools.get('search_logs').enabled).toBe(false);

      // But app selection tools should be enabled
      expect(registeredTools.get('get_apps').enabled).toBe(true);
      expect(registeredTools.get('select_app_id').enabled).toBe(true);
    });
  });

  describe('Tool Execution', () => {
    it('should handle get_apps with custom mock data', async () => {
      // Create a custom mock client for this specific test
      const customMockClient = createMockAppsignalClient();
      customMockClient.getApps = vi.fn().mockResolvedValue([
        { id: 'custom-app-1', name: 'Custom App', environment: 'custom-env' },
        { id: 'custom-app-2', name: 'Another Custom App', environment: 'test' },
      ]);

      registerToolsWithClient(customMockClient);
      const tool = registeredTools.get('get_apps');
      const result = await tool.handler({});

      const response = JSON.parse(result.content[0].text);
      expect(response.apps).toHaveLength(2);
      expect(response.apps[0].name).toBe('Custom App');
      expect(response.apps[0].environment).toBe('custom-env');
      expect(response.apps[1].name).toBe('Another Custom App');
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in get_apps gracefully', async () => {
      // Create a failing mock client
      const failingClient = createMockAppsignalClient();
      failingClient.getApps = vi.fn().mockRejectedValue(new Error('Network error'));

      registerToolsWithClient(failingClient);
      const tool = registeredTools.get('get_apps');
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Error fetching apps: Network error');
    });

    it('should return error when no app ID is selected', async () => {
      delete process.env.APPSIGNAL_APP_ID;
      vi.mocked(getSelectedAppId).mockReturnValue(undefined);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_exception_incident');
      const result = await tool.handler({ incidentId: 'exception-123' });

      expect(result.content[0].text).toContain('Error: No app ID selected');
      expect(result.content[0].text).toContain('Please use select_app_id tool first');
    });
  });

  describe('Exception Incident Tools', () => {
    describe('get_exception_incident', () => {
      it('should fetch exception incident successfully', async () => {
        const mockIncident = {
          id: 'exception-123',
          name: 'NullPointerException',
          message: 'Cannot read property x of null',
          count: 42,
          lastOccurredAt: '2023-12-01T10:00:00Z',
          status: 'open' as const,
        };

        mockClient.getExceptionIncident = vi.fn().mockResolvedValue(mockIncident);

        registerToolsWithClient(mockClient);
        const tool = registeredTools.get('get_exception_incident');
        const result = await tool.handler({ incidentId: 'exception-123' });

        expect(mockClient.getExceptionIncident).toHaveBeenCalledWith('exception-123');
        const response = JSON.parse(result.content[0].text);
        expect(response).toEqual(mockIncident);
      });

      it('should handle exception incident not found', async () => {
        mockClient.getExceptionIncident = vi
          .fn()
          .mockRejectedValue(new Error('Exception incident with ID exception-999 not found'));

        registerToolsWithClient(mockClient);
        const tool = registeredTools.get('get_exception_incident');
        const result = await tool.handler({ incidentId: 'exception-999' });

        expect(result.content[0].text).toContain(
          'Error fetching exception incident details: Exception incident with ID exception-999 not found'
        );
      });

      it('should handle network errors', async () => {
        mockClient.getExceptionIncident = vi.fn().mockRejectedValue(new Error('Network timeout'));

        registerToolsWithClient(mockClient);
        const tool = registeredTools.get('get_exception_incident');
        const result = await tool.handler({ incidentId: 'exception-123' });

        expect(result.content[0].text).toContain(
          'Error fetching exception incident details: Network timeout'
        );
      });
    });

    describe('get_exception_incident_sample', () => {
      it('should fetch exception incident sample successfully', async () => {
        const mockSample = {
          id: 'sample-1',
          timestamp: '2023-12-01T10:00:00Z',
          message: 'Cannot read property x of null',
          backtrace: [
            '/app/src/index.js:42 in processData',
            '/app/src/main.js:10 in handleRequest',
          ],
          action: 'UserController#create',
          namespace: 'web',
          revision: 'abc123',
          version: '1.0.0',
          duration: 142,
          queueDuration: 23,
          params: { userId: '123' },
          customData: { feature: 'user-signup' },
        };

        mockClient.getExceptionIncidentSample = vi.fn().mockResolvedValue(mockSample);

        registerToolsWithClient(mockClient);
        const tool = registeredTools.get('get_exception_incident_sample');
        const result = await tool.handler({ incidentId: 'exception-123', offset: 0 });

        expect(mockClient.getExceptionIncidentSample).toHaveBeenCalledWith('exception-123', 0);
        const response = JSON.parse(result.content[0].text);
        expect(response).toEqual(mockSample);
      });

      it('should fetch exception incident sample with offset', async () => {
        const mockSample = {
          id: 'sample-3',
          timestamp: '2023-12-01T10:02:00Z',
          message: 'Different error message',
          backtrace: ['/app/src/other.js:15 in otherFunction'],
          action: 'ApiController#index',
          namespace: 'api',
          revision: 'def456',
          version: '1.0.0',
        };

        mockClient.getExceptionIncidentSample = vi.fn().mockResolvedValue(mockSample);

        registerToolsWithClient(mockClient);
        const tool = registeredTools.get('get_exception_incident_sample');
        const result = await tool.handler({ incidentId: 'exception-123', offset: 2 });

        expect(mockClient.getExceptionIncidentSample).toHaveBeenCalledWith('exception-123', 2);
        const response = JSON.parse(result.content[0].text);
        expect(response.id).toBe('sample-3');
      });

      it('should handle no samples found', async () => {
        mockClient.getExceptionIncidentSample = vi
          .fn()
          .mockRejectedValue(
            new Error('No samples found for exception incident exception-123 at offset 10')
          );

        registerToolsWithClient(mockClient);
        const tool = registeredTools.get('get_exception_incident_sample');
        const result = await tool.handler({ incidentId: 'exception-123', offset: 10 });

        expect(result.content[0].text).toContain(
          'Error fetching exception incident sample: No samples found for exception incident exception-123 at offset 10'
        );
      });

      it('should handle network errors', async () => {
        mockClient.getExceptionIncidentSample = vi
          .fn()
          .mockRejectedValue(new Error('GraphQL request failed'));

        registerToolsWithClient(mockClient);
        const tool = registeredTools.get('get_exception_incident_sample');
        const result = await tool.handler({ incidentId: 'exception-123', offset: 0 });

        expect(result.content[0].text).toContain(
          'Error fetching exception incident sample: GraphQL request failed'
        );
      });
    });
  });

  describe('get_log_incident Tool', () => {
    it('should fetch log incident details successfully', async () => {
      vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_log_incident');
      const result = await tool.handler({ incidentId: 'log-123' });

      const response = JSON.parse(result.content[0].text);
      expect(response).toMatchObject({
        id: 'log-123',
        number: 123,
        summary: 'High Error Rate',
        severity: 'ERROR',
        state: 'OPEN',
        count: 156,
        lastOccurredAt: '2024-01-15T10:30:00Z',
        trigger: {
          query: 'level:error service:api',
        },
      });
    });

    it('should handle errors when fetching log incident', async () => {
      vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

      const failingClient = createMockAppsignalClient();
      failingClient.getLogIncident = vi.fn().mockRejectedValue(new Error('API request failed'));

      registerToolsWithClient(failingClient);
      const tool = registeredTools.get('get_log_incident');
      const result = await tool.handler({ incidentId: 'log-456' });

      expect(result.content[0].text).toContain(
        'Error fetching log incident details: API request failed'
      );
    });

    it('should require app ID to be selected', async () => {
      delete process.env.APPSIGNAL_APP_ID;
      vi.mocked(getSelectedAppId).mockReturnValue(undefined);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('get_log_incident');
      const result = await tool.handler({ incidentId: 'log-789' });

      expect(result.content[0].text).toContain('Error: No app ID selected');
    });
  });

  describe('search_logs Tool', () => {
    it('should search logs successfully', async () => {
      vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('search_logs');
      const result = await tool.handler({
        query: 'error',
        limit: 10,
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.queryWindow).toBe(3600);
      expect(response.lines).toHaveLength(1);
      expect(response.lines[0]).toMatchObject({
        timestamp: '2024-01-15T10:00:00Z',
        severity: 'ERROR',
        message: 'Database connection failed',
        hostname: 'api-server-01',
        attributes: expect.arrayContaining([
          { key: 'service', value: 'api-service' },
          { key: 'errorCode', value: 'DB_CONNECTION_ERROR' },
        ]),
      });
      expect(response.formattedSummary).toContain('Found 1 log entries');
    });

    it('should search logs with severity filters', async () => {
      vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

      const customClient = createMockAppsignalClient();
      customClient.searchLogs = vi
        .fn()
        .mockImplementation(async (query: string, limit?: number, severities?: string[]) => {
          const lines = severities?.includes('error')
            ? [
                {
                  id: 'log-filtered-1',
                  timestamp: '2024-01-15T10:00:00Z',
                  severity: 'ERROR',
                  message: 'Filtered error log',
                  hostname: 'api-server-01',
                  group: 'api-service',
                  attributes: [{ key: 'filtered', value: 'true' }],
                },
              ]
            : [];

          return {
            queryWindow: 3600,
            lines,
            formattedSummary: `Found ${lines.length} log entries within 3600s window.`,
          };
        });

      registerToolsWithClient(customClient);
      const tool = registeredTools.get('search_logs');
      const result = await tool.handler({
        query: '*',
        limit: 5,
        severities: ['error', 'fatal'],
      });

      const response = JSON.parse(result.content[0].text);
      expect(response.lines).toHaveLength(1);
      expect(response.lines[0].message).toBe('Filtered error log');
      expect(customClient.searchLogs).toHaveBeenCalledWith('*', 5, ['error', 'fatal']);
    });

    it('should handle search errors gracefully', async () => {
      vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

      const failingClient = createMockAppsignalClient();
      failingClient.searchLogs = vi.fn().mockRejectedValue(new Error('Search timeout'));

      registerToolsWithClient(failingClient);
      const tool = registeredTools.get('search_logs');
      const result = await tool.handler({ query: 'timeout' });

      expect(result.content[0].text).toContain('Error searching logs: Search timeout');
    });

    it('should return empty results for no matches', async () => {
      vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

      const customClient = createMockAppsignalClient();
      customClient.searchLogs = vi.fn().mockResolvedValue({
        queryWindow: 3600,
        lines: [],
        formattedSummary: 'Found 0 log entries within 3600s window.\n\n',
      });

      registerToolsWithClient(customClient);
      const tool = registeredTools.get('search_logs');
      const result = await tool.handler({ query: 'nonexistent' });

      const response = JSON.parse(result.content[0].text);
      expect(response.lines).toEqual([]);
    });

    it('should require app ID to be selected', async () => {
      delete process.env.APPSIGNAL_APP_ID;
      vi.mocked(getSelectedAppId).mockReturnValue(undefined);

      registerToolsWithClient(mockClient);
      const tool = registeredTools.get('search_logs');
      const result = await tool.handler({ query: 'test' });

      expect(result.content[0].text).toContain('Error: No app ID selected');
    });
  });
});
