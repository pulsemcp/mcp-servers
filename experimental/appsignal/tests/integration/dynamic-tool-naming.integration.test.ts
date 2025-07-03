import { describe, it, expect, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { createIntegrationMockAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.integration-mock.js';
import type { IAppsignalClient } from '../../shared/src/appsignal-client/appsignal-client.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Dynamic Tool Naming Integration Tests', () => {
  let client: TestMCPClient | null = null;

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should start with select_app_id when no app is configured', async () => {
    // Create a mock AppSignal client
    const mockAppSignalClient = createIntegrationMockAppsignalClient({});

    // Create TestMCPClient without APPSIGNAL_APP_ID
    client = await createTestMCPClientWithMock(mockAppSignalClient, false);

    // List tools to see the initial state
    const tools = await client.listTools();

    // Should have select_app_id tool
    const selectTool = tools.tools.find((t) => t.name === 'select_app_id');
    expect(selectTool).toBeDefined();
    expect(selectTool?.name).toBe('select_app_id');

    // Should NOT have change_app_id tool
    const changeTool = tools.tools.find((t) => t.name === 'change_app_id');
    expect(changeTool).toBeUndefined();
  });

  it('should NOT show get_apps or any app selection tools when app ID is locked via env var', async () => {
    // Create a mock AppSignal client
    const mockAppSignalClient = createIntegrationMockAppsignalClient({});

    // Create TestMCPClient WITH APPSIGNAL_APP_ID (locked mode)
    client = await createTestMCPClientWithMock(mockAppSignalClient, true);

    // List tools to see the initial state
    const tools = await client.listTools();

    // Should NOT have get_apps tool
    const getAppsTool = tools.tools.find((t) => t.name === 'get_apps');
    expect(getAppsTool).toBeUndefined();

    // Should NOT have change_app_id tool in locked mode
    const changeTool = tools.tools.find((t) => t.name === 'change_app_id');
    expect(changeTool).toBeUndefined();

    // Should NOT have select_app_id tool
    const selectTool = tools.tools.find((t) => t.name === 'select_app_id');
    expect(selectTool).toBeUndefined();

    // Main tools should be available
    const mainTools = tools.tools.filter((t) =>
      ['get_exception_incident', 'search_logs', 'get_log_incident'].includes(t.name)
    );
    expect(mainTools.length).toBeGreaterThan(0);
  });

  it('should dynamically change from select_app_id to change_app_id after selecting an app', async () => {
    // Create a mock AppSignal client
    const mockAppSignalClient = createIntegrationMockAppsignalClient({});

    // Create TestMCPClient without APPSIGNAL_APP_ID
    client = await createTestMCPClientWithMock(mockAppSignalClient, false);

    // Track list changed notifications
    let notificationReceived = false;
    client.setListChangedHandler(() => {
      notificationReceived = true;
    });

    // List tools before selecting app
    const toolsBefore = await client.listTools();
    const selectToolBefore = toolsBefore.tools.find((t) => t.name === 'select_app_id');
    expect(selectToolBefore).toBeDefined();

    // Select an app
    await client.callTool('select_app_id', {
      appId: 'test-app-123',
    });

    // Wait a bit for the notification to be processed
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Check that we received a notification
    expect(notificationReceived).toBe(true);

    // List tools after selecting app
    const toolsAfter = await client.listTools();

    // Should now have change_app_id tool
    const changeToolAfter = toolsAfter.tools.find((t) => t.name === 'change_app_id');
    expect(changeToolAfter).toBeDefined();
    expect(changeToolAfter?.name).toBe('change_app_id');

    // Should NOT have select_app_id tool anymore
    const selectToolAfter = toolsAfter.tools.find((t) => t.name === 'select_app_id');
    expect(selectToolAfter).toBeUndefined();
  });

  it('should enable main tools after selecting an app', async () => {
    // Create a mock AppSignal client with sample data
    const mockAppSignalClient = createIntegrationMockAppsignalClient({
      exceptionIncidents: [
        {
          id: 'test-incident',
          name: 'TestException',
          message: 'Test message',
          count: 1,
          lastOccurredAt: '2024-01-01T00:00:00Z',
          status: 'open',
        },
      ],
    });

    // Create TestMCPClient without APPSIGNAL_APP_ID
    client = await createTestMCPClientWithMock(mockAppSignalClient, false);

    // List tools before selecting app - main tools should be disabled
    const toolsBefore = await client.listTools();
    const mainToolsBefore = toolsBefore.tools.filter((t) =>
      ['get_exception_incident', 'search_logs', 'get_log_incident'].includes(t.name)
    );
    expect(mainToolsBefore.length).toBe(0); // Main tools should be disabled

    // Select an app
    await client.callTool('select_app_id', {
      appId: 'test-app-123',
    });

    // Wait a bit for tools to be enabled
    await new Promise((resolve) => setTimeout(resolve, 100));

    // List tools after selecting app - main tools should be enabled
    const toolsAfter = await client.listTools();
    const mainToolsAfter = toolsAfter.tools.filter((t) =>
      ['get_exception_incident', 'search_logs', 'get_log_incident'].includes(t.name)
    );
    expect(mainToolsAfter.length).toBeGreaterThan(0); // Main tools should now be enabled

    // Test that we can now use one of the main tools
    const result = await client.callTool('get_exception_incident', {
      incidentNumber: 'test-incident',
    });
    const incident = JSON.parse(result.content[0].text);
    expect(incident.id).toBe('test-incident');
  });

  it('should show combined appId and isLocked in resources', async () => {
    // Create a mock AppSignal client
    const mockAppSignalClient = createIntegrationMockAppsignalClient({});

    // Test with locked mode (env var set)
    client = await createTestMCPClientWithMock(mockAppSignalClient, true);

    const resources = await client.listResources();
    const configResource = resources.resources.find((r) => r.uri === 'appsignal://config');
    expect(configResource).toBeDefined();

    const configData = await client.readResource('appsignal://config');
    const config = JSON.parse(configData.contents[0].text);

    expect(config.appId).toBe('test-app-id'); // From env var
    expect(config.isLocked).toBe(true);
    expect(config.selectedAppId).toBeUndefined(); // Should not exist anymore

    await client.disconnect();
    client = null;

    // Test without locked mode (no env var)
    client = await createTestMCPClientWithMock(mockAppSignalClient, false);

    const configData2 = await client.readResource('appsignal://config');
    const config2 = JSON.parse(configData2.contents[0].text);

    expect(config2.appId).toBe('not configured');
    expect(config2.isLocked).toBe(false);
    expect(config2.selectedAppId).toBeUndefined(); // Should not exist anymore

    // Select an app
    await client.callTool('select_app_id', { appId: 'selected-app-123' });

    const configData3 = await client.readResource('appsignal://config');
    const config3 = JSON.parse(configData3.contents[0].text);

    expect(config3.appId).toBe('selected-app-123');
    expect(config3.isLocked).toBe(false);
    expect(config3.selectedAppId).toBeUndefined(); // Should not exist anymore
  });
});

/**
 * Helper function to create a TestMCPClient with a mocked AppSignal client.
 */
async function createTestMCPClientWithMock(
  mockAppSignalClient: IAppsignalClient & { mockData?: unknown },
  includeAppId = true
): Promise<TestMCPClient> {
  const mockData = mockAppSignalClient.mockData || {};

  const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

  const env: Record<string, string> = {
    APPSIGNAL_API_KEY: 'test-api-key',
    APPSIGNAL_MOCK_DATA: JSON.stringify(mockData),
  };

  if (includeAppId) {
    env.APPSIGNAL_APP_ID = 'test-app-id';
  }

  const client = new TestMCPClient({
    serverPath,
    env,
    debug: false,
  });

  await client.connect();
  return client;
}
