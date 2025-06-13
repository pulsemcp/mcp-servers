import { describe, it, expect, afterEach } from 'vitest';
import { createMockedClient } from './integration-test-helper.js';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';

describe('AppSignal MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should handle inline mocked exception incident response', async () => {
    client = await createMockedClient({
      exceptionIncidents: {
        'payment-failure': {
          id: 'payment-failure',
          name: 'PaymentGatewayException',
          message: 'Connection timeout to payment gateway',
          count: 42,
          lastOccurredAt: '2024-01-21T09:00:00Z',
          status: 'open',
        },
      },
    });

    const result = await client.callTool('get_exception_incident', {
      incidentId: 'payment-failure',
    });

    const incident = JSON.parse(result.content[0].text);
    expect(incident.id).toBe('payment-failure');
    expect(incident.status).toBe('open');
    expect(incident.name).toBe('PaymentGatewayException');
  });

  it('should handle inline mocked log incident response', async () => {
    client = await createMockedClient({
      logIncidents: {
        'high-error-rate': {
          id: 'high-error-rate',
          name: 'High Error Rate in API',
          severity: 'error',
          count: 156,
          lastOccurredAt: '2024-01-21T10:00:00Z',
          status: 'open',
          query: 'level:error service:api',
        },
      },
    });

    const result = await client.callTool('get_log_incident', {
      incidentId: 'high-error-rate',
    });

    const incident = JSON.parse(result.content[0].text);
    expect(incident.id).toBe('high-error-rate');
    expect(incident.severity).toBe('error');
    expect(incident.count).toBe(156);
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
            metadata: { userId: 'user-456', amount: 150.0 },
          },
        ],
        success: [
          {
            timestamp: '2024-01-21T11:00:00Z',
            level: 'info',
            message: 'Payment successful',
            metadata: { userId: 'user-789', amount: 50.0 },
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

  it('should handle exception incident samples', async () => {
    client = await createMockedClient({
      exceptionIncidentSamples: {
        'null-pointer-123': [
          {
            id: 'sample-1',
            timestamp: '2024-01-21T09:00:00Z',
            message: 'Cannot read property "id" of null',
            backtrace: [
              'at getUserData (user-service.js:45:12)',
              'at processRequest (api.js:123:8)',
            ],
            metadata: { userId: null, endpoint: '/api/user' },
          },
          {
            id: 'sample-2',
            timestamp: '2024-01-21T09:05:00Z',
            message: 'Cannot read property "id" of null',
            backtrace: [
              'at getUserData (user-service.js:45:12)',
              'at handleWebhook (webhook.js:67:15)',
            ],
            metadata: { source: 'webhook', userId: null },
          },
        ],
      },
    });

    const result = await client.callTool('get_exception_incident_samples', {
      incidentId: 'null-pointer-123',
      limit: 10,
    });

    const samples = JSON.parse(result.content[0].text);
    expect(samples).toHaveLength(2);
    expect(samples[0].message).toContain('Cannot read property');
    expect(samples[0].backtrace).toHaveLength(2);
    expect(samples[1].metadata.source).toBe('webhook');
  });

  it('should handle mixed inline mocks', async () => {
    client = await createMockedClient({
      exceptionIncidents: {
        'mixed-test': {
          id: 'mixed-test',
          name: 'TestException',
          message: 'Test exception message',
          count: 1,
          lastOccurredAt: '2024-01-21T12:00:00Z',
          status: 'resolved',
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

    // Test exception incident
    const incidentResult = await client.callTool('get_exception_incident', {
      incidentId: 'mixed-test',
    });
    const incident = JSON.parse(incidentResult.content[0].text);
    expect(incident.status).toBe('resolved');

    // Test search
    const searchResult = await client.callTool('search_logs', {
      query: 'test query',
    });
    const logs = JSON.parse(searchResult.content[0].text);
    expect(logs[0].level).toBe('debug');
  });
});
