import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import { createIntegrationMockAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.integration-mock.js';
import type { IAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AppSignal MCP Server Integration', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should retrieve exception details (happy path)', async () => {
    // Create a mock AppSignal client with custom mock data
    const mockAppSignalClient = createIntegrationMockAppsignalClient({
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

    // Create TestMCPClient that will use our mocked AppSignal client
    client = await createTestMCPClientWithMock(mockAppSignalClient);

    // Call the MCP tool
    const result = await client.callTool('get_exception_incident', {
      incidentId: 'payment-failure',
    });

    // Verify the result
    const incident = JSON.parse(result.content[0].text);
    expect(incident.id).toBe('payment-failure');
    expect(incident.status).toBe('open');
    expect(incident.name).toBe('PaymentGatewayException');
  });

  it('should handle non-existent incident gracefully', async () => {
    // Create a mock AppSignal client with empty data (will use defaults)
    const mockAppSignalClient = createIntegrationMockAppsignalClient({});

    // Create TestMCPClient that will use our mocked AppSignal client
    client = await createTestMCPClientWithMock(mockAppSignalClient);

    // Call the MCP tool
    const result = await client.callTool('get_exception_incident', {
      incidentId: 'non-existent-incident',
    });

    // The mock will return a default incident
    const incident = JSON.parse(result.content[0].text);
    expect(incident.id).toBe('non-existent-incident');
    expect(incident.name).toBe('Mock Exception');
  });

  it('should search logs with custom mock data', async () => {
    // Create a mock AppSignal client with specific log search responses
    const mockAppSignalClient = createIntegrationMockAppsignalClient({
      searchResponses: {
        'level:error service:api': [
          {
            timestamp: '2024-01-15T10:00:00Z',
            level: 'error',
            message: 'Database connection failed',
            metadata: {
              service: 'api-service',
              errorCode: 'DB_CONNECTION_ERROR',
            },
          },
          {
            timestamp: '2024-01-15T10:05:00Z',
            level: 'error',
            message: 'Payment processing timeout',
            metadata: {
              service: 'api-service',
              errorCode: 'PAYMENT_TIMEOUT',
            },
          },
        ],
      },
    });

    // Create TestMCPClient that will use our mocked AppSignal client
    client = await createTestMCPClientWithMock(mockAppSignalClient);

    // Call the MCP tool
    const result = await client.callTool('search_logs', {
      query: 'level:error service:api',
      limit: 10,
    });

    // Verify the results
    const response = JSON.parse(result.content[0].text);
    expect(response).toHaveLength(2);
    expect(response[0].message).toBe('Database connection failed');
    expect(response[1].message).toBe('Payment processing timeout');
    expect(response[0].metadata.errorCode).toBe('DB_CONNECTION_ERROR');
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked AppSignal client.
 * This demonstrates how we're mocking the AppSignal API calls, not the MCP client.
 */
async function createTestMCPClientWithMock(
  mockAppSignalClient: IAppsignalClient & { mockData?: any }
): Promise<TestMCPClient> {
  // We need to pass the mock to the server somehow.
  // Since we can't inject it directly, we'll use environment variables
  // to tell the server to use our mock data.
  const mockData = mockAppSignalClient.mockData || {};

  const serverPath = path.join(__dirname, '../../local/build/src/index.integration-with-mock.js');

  const client = new TestMCPClient({
    serverPath,
    env: {
      APPSIGNAL_API_KEY: 'test-api-key',
      APPSIGNAL_APP_ID: 'test-app-id',
      APPSIGNAL_MOCK_DATA: JSON.stringify(mockData),
    },
    debug: false,
  });

  await client.connect();
  return client;
}
