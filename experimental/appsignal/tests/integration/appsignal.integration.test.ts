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
      exceptionIncidents: [
        {
          id: 'payment-failure',
          name: 'PaymentGatewayException',
          message: 'Connection timeout to payment gateway',
          count: 42,
          lastOccurredAt: '2024-01-21T09:00:00Z',
          status: 'open',
        },
        {
          id: 'auth-error',
          name: 'AuthenticationException',
          message: 'Invalid credentials',
          count: 15,
          lastOccurredAt: '2024-01-21T08:30:00Z',
          status: 'open',
        },
      ],
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
    expect(incident.message).toBe('Connection timeout to payment gateway');
    expect(incident.count).toBe(42);
  });

  it('should handle non-existent incident with error', async () => {
    // Create a mock AppSignal client with specific incidents
    const mockAppSignalClient = createIntegrationMockAppsignalClient({
      exceptionIncidents: [
        {
          id: 'existing-incident',
          name: 'ExistingException',
          message: 'This exists',
          count: 1,
          lastOccurredAt: '2024-01-21T09:00:00Z',
          status: 'open',
        },
      ],
    });

    // Create TestMCPClient that will use our mocked AppSignal client
    client = await createTestMCPClientWithMock(mockAppSignalClient);

    // Call the MCP tool with non-existent ID
    const result = await client.callTool('get_exception_incident', {
      incidentId: 'non-existent-incident',
    });

    // Should return an error message
    expect(result.content[0].text).toContain('Error fetching exception incident details');
    expect(result.content[0].text).toContain('not found');
  });

  it('should retrieve exception incident sample (happy path)', async () => {
    // Create a mock AppSignal client with sample data
    const mockAppSignalClient = createIntegrationMockAppsignalClient({
      exceptionSamples: {
        'payment-failure': [
          {
            id: 'sample-1',
            timestamp: '2024-01-21T09:00:00Z',
            message: 'Connection timeout to payment gateway',
            backtrace: [
              '/app/src/payment/gateway.js:42 in processPayment',
              '/app/src/controllers/checkout.js:15 in handleCheckout',
            ],
            action: 'CheckoutController#process',
            namespace: 'web',
            revision: 'abc123',
            version: '1.2.3',
          },
          {
            id: 'sample-2',
            timestamp: '2024-01-21T09:05:00Z',
            message: 'Connection timeout to payment gateway',
            backtrace: [
              '/app/src/payment/gateway.js:42 in processPayment',
              '/app/src/controllers/checkout.js:15 in handleCheckout',
            ],
            action: 'CheckoutController#process',
            namespace: 'web',
            revision: 'abc124',
            version: '1.2.3',
          },
        ],
      },
    });

    // Create TestMCPClient that will use our mocked AppSignal client
    client = await createTestMCPClientWithMock(mockAppSignalClient);

    // Call the MCP tool - get first sample
    const result = await client.callTool('get_exception_incident_sample', {
      incidentId: 'payment-failure',
      offset: 0,
    });

    // Verify the result
    const sample = JSON.parse(result.content[0].text);
    expect(sample.id).toBe('sample-1');
    expect(sample.timestamp).toBe('2024-01-21T09:00:00Z');
    expect(sample.message).toBe('Connection timeout to payment gateway');
    expect(sample.backtrace).toHaveLength(2);
    expect(sample.action).toBe('CheckoutController#process');
  });

  it('should retrieve exception incident sample with offset', async () => {
    // Create a mock AppSignal client with multiple samples
    const mockAppSignalClient = createIntegrationMockAppsignalClient({
      exceptionSamples: {
        'payment-failure': [
          {
            id: 'sample-1',
            timestamp: '2024-01-21T09:00:00Z',
            message: 'First sample',
            backtrace: [],
            action: 'DefaultController#index',
            namespace: 'web',
            revision: '000000',
            version: '1.0.0',
          },
          {
            id: 'sample-2',
            timestamp: '2024-01-21T09:05:00Z',
            message: 'Second sample',
            backtrace: [],
            action: 'DefaultController#index',
            namespace: 'web',
            revision: '000000',
            version: '1.0.0',
          },
          {
            id: 'sample-3',
            timestamp: '2024-01-21T09:10:00Z',
            message: 'Third sample',
            backtrace: [],
            action: 'DefaultController#index',
            namespace: 'web',
            revision: '000000',
            version: '1.0.0',
          },
        ],
      },
    });

    // Create TestMCPClient that will use our mocked AppSignal client
    client = await createTestMCPClientWithMock(mockAppSignalClient);

    // Call the MCP tool - get third sample (offset 2)
    const result = await client.callTool('get_exception_incident_sample', {
      incidentId: 'payment-failure',
      offset: 2,
    });

    // Verify the result
    const sample = JSON.parse(result.content[0].text);
    expect(sample.id).toBe('sample-3');
    expect(sample.message).toBe('Third sample');
  });

  it('should handle no samples found at offset', async () => {
    // Create a mock AppSignal client with only one sample
    const mockAppSignalClient = createIntegrationMockAppsignalClient({
      exceptionSamples: {
        'payment-failure': [
          {
            id: 'sample-1',
            timestamp: '2024-01-21T09:00:00Z',
            message: 'Only sample',
            backtrace: [],
            action: 'DefaultController#index',
            namespace: 'web',
            revision: '000000',
            version: '1.0.0',
          },
        ],
      },
    });

    // Create TestMCPClient that will use our mocked AppSignal client
    client = await createTestMCPClientWithMock(mockAppSignalClient);

    // Call the MCP tool - try to get sample at offset 5
    const result = await client.callTool('get_exception_incident_sample', {
      incidentId: 'payment-failure',
      offset: 5,
    });

    // Should return an error message
    expect(result.content[0].text).toContain('Error fetching exception incident sample');
    expect(result.content[0].text).toContain('No samples found');
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

  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

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
