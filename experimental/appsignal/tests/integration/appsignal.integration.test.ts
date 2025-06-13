import { describe, it, expect, afterEach } from 'vitest';
import { createMockedClient } from './integration-test-helper.js';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';

describe('AppSignal MCP Server Integration', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should retrieve exception details (happy path)', async () => {
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

  it('should handle non-existent incident gracefully', async () => {
    client = await createMockedClient({});

    const result = await client.callTool('get_exception_incident', {
      incidentId: 'non-existent-incident',
    });

    // The mock will return a default incident
    const incident = JSON.parse(result.content[0].text);
    expect(incident.id).toBe('non-existent-incident');
    expect(incident.name).toBe('Mock Exception');
  });
});
