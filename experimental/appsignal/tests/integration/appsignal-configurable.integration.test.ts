import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MockedTestMCPClient, MockDefinitions } from './mock-helper.js';

describe('AppSignal MCP Server Configurable Mock Tests', () => {
  let client: MockedTestMCPClient;

  beforeAll(async () => {
    client = new MockedTestMCPClient();
    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Custom Mock Responses', () => {
    beforeEach(() => {
      // Reset to default mocks
      client.updateMocks({});
    });

    it('should return custom alert details', async () => {
      // Define custom mock for this test
      client.updateMocks({
        getAlertDetails: {
          'critical-alert': {
            id: 'critical-alert',
            status: 'active',
            triggers: [
              {
                timestamp: '2024-01-20T10:00:00Z',
                message: 'CPU usage exceeded 90%',
              },
              {
                timestamp: '2024-01-20T10:05:00Z',
                message: 'Memory usage exceeded 85%',
              },
            ],
            affectedServices: ['api', 'database', 'cache'],
          },
        },
      });

      const result = await client.callTool('get_alert_details', {
        alertId: 'critical-alert',
      });

      expect(result.isError).toBe(false);
      const alert = JSON.parse(result.content[0].text);
      expect(alert.id).toBe('critical-alert');
      expect(alert.triggers).toHaveLength(2);
      expect(alert.affectedServices).toHaveLength(3);
    });

    it('should return custom search results', async () => {
      // Define custom mock for specific queries
      client.updateMocks({
        searchLogs: [
          {
            query: 'database timeout',
            response: [
              {
                timestamp: '2024-01-20T15:30:00Z',
                level: 'error',
                message: 'Database connection timeout after 30s',
                metadata: {
                  service: 'api',
                  database: 'postgresql',
                  timeout: 30000,
                },
              },
              {
                timestamp: '2024-01-20T15:32:00Z',
                level: 'error',
                message: 'Database query timeout',
                metadata: {
                  service: 'worker',
                  query: 'SELECT * FROM large_table',
                },
              },
            ],
          },
          {
            query: 'authentication',
            response: [
              {
                timestamp: '2024-01-20T16:00:00Z',
                level: 'warn',
                message: 'Authentication failed for user',
                metadata: {
                  userId: 'user123',
                  ip: '192.168.1.100',
                },
              },
            ],
          },
        ],
      });

      // Test first query
      const result1 = await client.callTool('search_logs', {
        query: 'database timeout',
        limit: 10,
      });

      const logs1 = JSON.parse(result1.content[0].text);
      expect(logs1).toHaveLength(2);
      expect(logs1[0].message).toContain('Database connection timeout');

      // Test second query
      const result2 = await client.callTool('search_logs', {
        query: 'authentication',
        limit: 10,
      });

      const logs2 = JSON.parse(result2.content[0].text);
      expect(logs2).toHaveLength(1);
      expect(logs2[0].message).toContain('Authentication failed');
    });

    it('should handle error responses', async () => {
      // Define mock that returns errors
      client.updateMocks({
        getAlertDetails: {
          'forbidden-alert': { error: 'Access denied to alert' },
        },
        searchLogs: [
          {
            query: 'restricted',
            response: { error: 'Insufficient permissions to search logs' },
          },
        ],
      });

      // Test alert error
      const alertResult = await client.callTool('get_alert_details', {
        alertId: 'forbidden-alert',
      });

      expect(alertResult.content[0].text).toContain('Error fetching alert details');
      expect(alertResult.content[0].text).toContain('Access denied to alert');

      // Test search error
      const searchResult = await client.callTool('search_logs', {
        query: 'restricted',
      });

      expect(searchResult.content[0].text).toContain('Error searching logs');
      expect(searchResult.content[0].text).toContain('Insufficient permissions');
    });

    it('should handle date range queries with custom responses', async () => {
      client.updateMocks({
        getLogsInDatetimeRange: [
          {
            start: '2024-01-20T00:00:00Z',
            end: '2024-01-20T06:00:00Z',
            response: [
              {
                timestamp: '2024-01-20T02:00:00Z',
                level: 'info',
                message: 'Nightly backup started',
                metadata: { job: 'backup', phase: 'start' },
              },
              {
                timestamp: '2024-01-20T03:30:00Z',
                level: 'info',
                message: 'Nightly backup completed',
                metadata: { job: 'backup', phase: 'complete', duration: 5400 },
              },
            ],
          },
        ],
      });

      const result = await client.callTool('get_logs_in_datetime_range', {
        start: '2024-01-20T00:00:00Z',
        end: '2024-01-20T06:00:00Z',
        limit: 50,
      });

      const logs = JSON.parse(result.content[0].text);
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toContain('backup started');
      expect(logs[1].message).toContain('backup completed');
    });

    it('should fall back to default mocks for undefined cases', async () => {
      // Don't define any custom mocks
      client.updateMocks({});

      const result = await client.callTool('get_alert_details', {
        alertId: 'any-alert',
      });

      const alert = JSON.parse(result.content[0].text);
      expect(alert.id).toBe('any-alert');
      expect(alert.triggers[0].message).toContain('Default mock alert trigger');
    });
  });
});