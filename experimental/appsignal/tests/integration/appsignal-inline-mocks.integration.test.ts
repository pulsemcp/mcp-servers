import { describe, it, expect, afterEach } from 'vitest';
import { createMockedClient } from './inline-mock-helper.js';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';

describe('AppSignal MCP Server Inline Mock Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should handle inline mocked alert response', async () => {
    client = await createMockedClient({
      alerts: {
        'payment-failure': {
          id: 'payment-failure',
          status: 'active',
          triggers: [
            {
              timestamp: '2024-01-21T09:00:00Z',
              message: 'Payment gateway timeout',
            },
          ],
          affectedServices: ['payment-service', 'checkout-api'],
        },
      },
    });

    const result = await client.callTool('get_alert_details', {
      alertId: 'payment-failure',
    });

    const alert = JSON.parse(result.content[0].text);
    expect(alert.id).toBe('payment-failure');
    expect(alert.status).toBe('active');
    expect(alert.affectedServices).toContain('payment-service');
  });

  it('should handle inline mocked search responses', async () => {
    client = await createMockedClient({
      searchResponses: {
        'payment failed': [
          {
            timestamp: '2024-01-21T10:00:00Z',
            level: 'error',
            message: 'Payment failed: Invalid card',
            metadata: { userId: 'user-123', amount: 99.99 },
          },
          {
            timestamp: '2024-01-21T10:05:00Z',
            level: 'error',
            message: 'Payment failed: Insufficient funds',
            metadata: { userId: 'user-456', amount: 150.00 },
          },
        ],
        'success': [
          {
            timestamp: '2024-01-21T11:00:00Z',
            level: 'info',
            message: 'Payment successful',
            metadata: { userId: 'user-789', amount: 50.00 },
          },
        ],
      },
    });

    // Test first search
    const result1 = await client.callTool('search_logs', {
      query: 'payment failed',
      limit: 10,
    });

    const logs1 = JSON.parse(result1.content[0].text);
    expect(logs1).toHaveLength(2);
    expect(logs1[0].message).toContain('Invalid card');
    expect(logs1[1].message).toContain('Insufficient funds');

    // Test second search
    const result2 = await client.callTool('search_logs', {
      query: 'success',
      limit: 10,
    });

    const logs2 = JSON.parse(result2.content[0].text);
    expect(logs2).toHaveLength(1);
    expect(logs2[0].message).toContain('Payment successful');
  });

  it('should handle date range queries with inline mocks', async () => {
    // For date range mocks, we use "start|end" as the key
    client = await createMockedClient({
      dateRangeResponses: {
        '2024-01-21T00:00:00Z|2024-01-21T12:00:00Z': [
          {
            timestamp: '2024-01-21T06:00:00Z',
            level: 'info',
            message: 'Morning health check passed',
            metadata: { service: 'api', status: 'healthy' },
          },
          {
            timestamp: '2024-01-21T09:00:00Z',
            level: 'warn',
            message: 'High memory usage detected',
            metadata: { service: 'worker', memory: '85%' },
          },
        ],
      },
    });

    const result = await client.callTool('get_logs_in_datetime_range', {
      start: '2024-01-21T00:00:00Z',
      end: '2024-01-21T12:00:00Z',
      limit: 50,
    });

    const logs = JSON.parse(result.content[0].text);
    expect(logs).toHaveLength(2);
    expect(logs[0].message).toContain('health check');
    expect(logs[1].level).toBe('warn');
  });

  it('should handle mixed inline mocks', async () => {
    client = await createMockedClient({
      alerts: {
        'mixed-test': {
          id: 'mixed-test',
          status: 'resolved',
          triggers: [],
          affectedServices: [],
        },
      },
      searchResponses: {
        'test query': [
          {
            timestamp: new Date().toISOString(),
            level: 'debug',
            message: 'Test log entry',
          },
        ],
      },
    });

    // Test alert
    const alertResult = await client.callTool('get_alert_details', {
      alertId: 'mixed-test',
    });
    const alert = JSON.parse(alertResult.content[0].text);
    expect(alert.status).toBe('resolved');

    // Test search
    const searchResult = await client.callTool('search_logs', {
      query: 'test query',
    });
    const logs = JSON.parse(searchResult.content[0].text);
    expect(logs[0].level).toBe('debug');
  });
});