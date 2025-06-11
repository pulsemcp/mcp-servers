import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { createRegisterTools, GetAlertDetailsSchema, SearchLogsSchema } from '../../shared/src/tools';
import { createMockAppsignalClient, mockAlert, mockLogEntries } from '../mocks/appsignal-client.mock';
import type { IAppsignalClient } from '../../shared/src/appsignal-client';

describe('AppSignal MCP Tools', () => {
  let mockServer: Server;
  let mockClient: IAppsignalClient;
  let callToolHandler: any;

  beforeEach(() => {
    // Reset environment variables
    process.env.APPSIGNAL_API_KEY = 'test-api-key';
    process.env.APPSIGNAL_APP_ID = 'test-app-id';

    // Create mock client
    mockClient = createMockAppsignalClient();

    // Create mock server
    mockServer = {
      setRequestHandler: vi.fn((schema, handler) => {
        if (schema === CallToolRequestSchema) {
          callToolHandler = handler;
        }
      }),
    } as any;

    // Register tools with mock client factory
    const registerTools = createRegisterTools(() => mockClient);
    registerTools(mockServer);
  });

  describe('Environment Variable Validation', () => {
    it('should return error when APPSIGNAL_API_KEY is missing', async () => {
      delete process.env.APPSIGNAL_API_KEY;

      const result = await callToolHandler({
        params: {
          name: 'get_alert_details',
          arguments: { alertId: 'test-123' },
        },
      });

      expect(result.content[0].text).toContain('APPSIGNAL_API_KEY and APPSIGNAL_APP_ID environment variables must be configured');
    });

    it('should return error when APPSIGNAL_APP_ID is missing', async () => {
      delete process.env.APPSIGNAL_APP_ID;

      const result = await callToolHandler({
        params: {
          name: 'search_logs',
          arguments: { query: 'error' },
        },
      });

      expect(result.content[0].text).toContain('APPSIGNAL_API_KEY and APPSIGNAL_APP_ID environment variables must be configured');
    });
  });

  describe('get_alert_details Tool', () => {
    it('should successfully fetch alert details', async () => {
      vi.mocked(mockClient.getAlertDetails).mockResolvedValue(mockAlert);

      const result = await callToolHandler({
        params: {
          name: 'get_alert_details',
          arguments: { alertId: 'alert-123' },
        },
      });

      expect(mockClient.getAlertDetails).toHaveBeenCalledWith('alert-123');
      expect(JSON.parse(result.content[0].text)).toEqual(mockAlert);
      expect(result.isError).toBeUndefined();
    });

    it('should handle errors gracefully', async () => {
      vi.mocked(mockClient.getAlertDetails).mockRejectedValue(new Error('API rate limit exceeded'));

      const result = await callToolHandler({
        params: {
          name: 'get_alert_details',
          arguments: { alertId: 'alert-123' },
        },
      });

      expect(result.content[0].text).toContain('Error fetching alert details: API rate limit exceeded');
      expect(result.isError).toBe(true);
    });

    it('should validate alertId parameter', async () => {
      // Test with invalid arguments
      await expect(async () => {
        await callToolHandler({
          params: {
            name: 'get_alert_details',
            arguments: { }, // missing alertId
          },
        });
      }).rejects.toThrow();
    });
  });

  describe('search_logs Tool', () => {
    it('should search logs with default parameters', async () => {
      vi.mocked(mockClient.searchLogs).mockResolvedValue(mockLogEntries);

      const result = await callToolHandler({
        params: {
          name: 'search_logs',
          arguments: { query: 'error level:critical' },
        },
      });

      expect(mockClient.searchLogs).toHaveBeenCalledWith('error level:critical', 100, 0);
      expect(JSON.parse(result.content[0].text)).toEqual(mockLogEntries);
    });

    it('should search logs with custom limit and offset', async () => {
      vi.mocked(mockClient.searchLogs).mockResolvedValue(mockLogEntries);

      const result = await callToolHandler({
        params: {
          name: 'search_logs',
          arguments: {
            query: 'database',
            limit: 50,
            offset: 20,
          },
        },
      });

      expect(mockClient.searchLogs).toHaveBeenCalledWith('database', 50, 20);
    });

    it('should handle search errors', async () => {
      vi.mocked(mockClient.searchLogs).mockRejectedValue(new Error('Invalid search syntax'));

      const result = await callToolHandler({
        params: {
          name: 'search_logs',
          arguments: { query: 'invalid::query' },
        },
      });

      expect(result.content[0].text).toContain('Error searching logs: Invalid search syntax');
      expect(result.isError).toBe(true);
    });
  });

  describe('Tool Schema Validation', () => {
    it('should validate search logs schema', () => {
      const validInput = { query: 'test', limit: 10, offset: 5 };
      const parsed = SearchLogsSchema.parse(validInput);
      expect(parsed).toEqual(validInput);
    });

    it('should provide defaults for optional parameters', () => {
      const input = { query: 'test' };
      const parsed = SearchLogsSchema.parse(input);
      expect(parsed).toEqual({
        query: 'test',
        limit: 100,
        offset: 0,
      });
    });

    it('should reject invalid schema', () => {
      expect(() => {
        SearchLogsSchema.parse({ limit: 10 }); // missing required query
      }).toThrow();
    });
  });

  describe('Unknown Tool Handling', () => {
    it('should throw error for unknown tool', async () => {
      await expect(async () => {
        await callToolHandler({
          params: {
            name: 'unknown_tool',
            arguments: {},
          },
        });
      }).rejects.toThrow('Unknown tool: unknown_tool');
    });
  });
});