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
import { getSelectedAppId, getEffectiveAppId, isAppIdLocked } from '../../../shared/src/state';
import { createMockAppsignalClient } from '../../mocks/appsignal-client.functional-mock';
import type { IAppsignalClient } from '../../../shared/src/appsignal-client/appsignal-client';

interface Tool {
  name: string;
  schema: unknown;
  handler: (args: unknown) => Promise<unknown>;
  enabled: boolean;
}

describe('search_logs Tool', () => {
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
    expect(customClient.searchLogs).toHaveBeenCalledWith(
      '*',
      5,
      ['error', 'fatal'],
      undefined,
      undefined
    );
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
    vi.mocked(getEffectiveAppId).mockReturnValue(undefined);
    vi.mocked(isAppIdLocked).mockReturnValue(false);

    registerToolsWithClient(mockClient);
    const tool = registeredTools.get('search_logs');
    const result = await tool.handler({ query: 'test' });

    expect(result.content[0].text).toContain('Error: No app ID configured');
  });

  it('should search logs with start and end time parameters', async () => {
    vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

    const customClient = createMockAppsignalClient();
    customClient.searchLogs = vi
      .fn()
      .mockImplementation(
        async (
          query: string,
          limit?: number,
          severities?: string[],
          start?: string,
          end?: string
        ) => {
          // Verify the parameters are passed correctly
          expect(start).toBe('2024-01-15T00:00:00Z');
          expect(end).toBe('2024-01-15T23:59:59Z');

          return {
            queryWindow: 86400, // 24 hours
            lines: [
              {
                id: 'log-time-filtered-1',
                timestamp: '2024-01-15T12:00:00Z',
                severity: 'INFO',
                message: 'Log within time range',
                hostname: 'api-server-01',
                group: 'api-service',
                attributes: [{ key: 'timeFiltered', value: 'true' }],
              },
            ],
            formattedSummary: 'Found 1 log entries within 86400s window.',
          };
        }
      );

    registerToolsWithClient(customClient);
    const tool = registeredTools.get('search_logs');
    const result = await tool.handler({
      query: 'time range test',
      limit: 10,
      start: '2024-01-15T00:00:00Z',
      end: '2024-01-15T23:59:59Z',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.lines).toHaveLength(1);
    expect(response.lines[0].message).toBe('Log within time range');
    expect(customClient.searchLogs).toHaveBeenCalledWith(
      'time range test',
      10,
      undefined,
      '2024-01-15T00:00:00Z',
      '2024-01-15T23:59:59Z'
    );
  });

  it('should search logs with only start time parameter', async () => {
    vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

    const customClient = createMockAppsignalClient();
    customClient.searchLogs = vi
      .fn()
      .mockImplementation(
        async (
          query: string,
          limit?: number,
          severities?: string[],
          start?: string,
          end?: string
        ) => {
          expect(start).toBe('2024-01-15T00:00:00Z');
          expect(end).toBeUndefined();

          return {
            queryWindow: 3600,
            lines: [],
            formattedSummary: 'Found 0 log entries within 3600s window.',
          };
        }
      );

    registerToolsWithClient(customClient);
    const tool = registeredTools.get('search_logs');
    const result = await tool.handler({
      query: 'start only test',
      limit: 50,
      start: '2024-01-15T00:00:00Z',
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.lines).toEqual([]);
    expect(customClient.searchLogs).toHaveBeenCalledWith(
      'start only test',
      50,
      undefined,
      '2024-01-15T00:00:00Z',
      undefined
    );
  });

  it('should handle empty severities array properly', async () => {
    vi.mocked(getSelectedAppId).mockReturnValue('test-app-id');

    const customClient = createMockAppsignalClient();
    customClient.searchLogs = vi.fn().mockResolvedValue({
      queryWindow: 3600,
      lines: [
        {
          id: 'log-all-1',
          timestamp: '2024-01-15T10:00:00Z',
          severity: 'INFO',
          message: 'All severity levels included',
          hostname: 'api-server-01',
          group: 'api-service',
          attributes: [{ key: 'test', value: 'empty-severities' }],
        },
      ],
      formattedSummary: 'Found 1 log entries within 3600s window.',
    });

    registerToolsWithClient(customClient);
    const tool = registeredTools.get('search_logs');
    const result = await tool.handler({
      query: 'test',
      limit: 10,
      severities: [], // Empty array
    });

    const response = JSON.parse(result.content[0].text);
    expect(response.lines).toHaveLength(1);
    // The empty array should be passed through, not converted to undefined
    expect(customClient.searchLogs).toHaveBeenCalledWith('test', 10, [], undefined, undefined);
  });
});
