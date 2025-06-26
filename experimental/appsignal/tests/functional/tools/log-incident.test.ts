import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createRegisterTools } from '../../../shared/src/tools';
import { getSelectedAppId } from '../../../shared/src/state';
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

describe('get_log_incident Tool', () => {
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
