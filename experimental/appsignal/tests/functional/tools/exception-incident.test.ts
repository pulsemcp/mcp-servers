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

describe('Exception Incident Tools', () => {
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
        backtrace: ['/app/src/index.js:42 in processData', '/app/src/main.js:10 in handleRequest'],
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
