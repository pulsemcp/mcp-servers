import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools, createRegisterTools } from '../../../shared/src/tools';
import { getSelectedAppId } from '../../../shared/src/state';
import { createMockAppsignalClient } from '../../mocks/appsignal-client.functional-mock';

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

describe('Tool Registration', () => {
  let mockServer: McpServer;
  let registeredTools: Map<string, Tool>;

  beforeEach(() => {
    // Reset environment variables
    process.env.APPSIGNAL_API_KEY = 'test-api-key';
    process.env.APPSIGNAL_APP_ID = 'test-app-id';

    // Reset mocks
    vi.clearAllMocks();

    // Create a mock server that captures tool registrations
    registeredTools = new Map();
    mockServer = {
      tool: vi.fn((name, schema, handler) => {
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
  });

  afterEach(() => {
    delete process.env.APPSIGNAL_API_KEY;
    delete process.env.APPSIGNAL_APP_ID;
  });

  it('should register all tools when API key is provided', () => {
    registerTools(mockServer);

    expect(mockServer.tool).toHaveBeenCalledTimes(11);
    expect(registeredTools.has('get_apps')).toBe(true);
    expect(registeredTools.has('select_app_id')).toBe(true);
    expect(registeredTools.has('change_app_id')).toBe(true);
    expect(registeredTools.has('get_exception_incident')).toBe(true);
    expect(registeredTools.has('get_exception_incident_sample')).toBe(true);
    expect(registeredTools.has('get_log_incident')).toBe(true);
    expect(registeredTools.has('search_logs')).toBe(true);
    expect(registeredTools.has('get_anomaly_incident')).toBe(true);
    expect(registeredTools.has('get_log_incidents')).toBe(true);
    expect(registeredTools.has('get_exception_incidents')).toBe(true);
    expect(registeredTools.has('get_anomaly_incidents')).toBe(true);
  });

  it('should throw error when API key is missing', () => {
    delete process.env.APPSIGNAL_API_KEY;

    expect(() => registerTools(mockServer)).toThrow(
      'APPSIGNAL_API_KEY environment variable must be configured'
    );
  });

  it('should disable main tools when no app ID is provided', () => {
    delete process.env.APPSIGNAL_APP_ID;
    vi.mocked(getSelectedAppId).mockReturnValue(undefined);
    const registerTools = createRegisterTools(() => createMockAppsignalClient());

    registerTools(mockServer);

    // Check that main tools are disabled
    expect(registeredTools.get('get_exception_incident').enabled).toBe(false);
    expect(registeredTools.get('get_exception_incident_sample').enabled).toBe(false);
    expect(registeredTools.get('get_log_incident').enabled).toBe(false);
    expect(registeredTools.get('search_logs').enabled).toBe(false);
    expect(registeredTools.get('get_anomaly_incident').enabled).toBe(false);
    expect(registeredTools.get('get_log_incidents').enabled).toBe(false);
    expect(registeredTools.get('get_exception_incidents').enabled).toBe(false);
    expect(registeredTools.get('get_anomaly_incidents').enabled).toBe(false);

    // But app selection tools should be enabled
    expect(registeredTools.get('get_apps').enabled).toBe(true);
    expect(registeredTools.get('select_app_id').enabled).toBe(true);
  });

  it('should handle get_apps with custom mock data', async () => {
    // Create a custom mock client for this specific test
    const customMockClient = createMockAppsignalClient();
    customMockClient.getApps = vi.fn().mockResolvedValue([
      { id: 'custom-app-1', name: 'Custom App', environment: 'custom-env' },
      { id: 'custom-app-2', name: 'Another Custom App', environment: 'test' },
    ]);

    const registerTools = createRegisterTools(() => customMockClient);
    registerTools(mockServer);
    const tool = registeredTools.get('get_apps');
    const result = await tool.handler({});

    const response = JSON.parse(result.content[0].text);
    expect(response.apps).toHaveLength(2);
    expect(response.apps[0].name).toBe('Custom App');
    expect(response.apps[0].environment).toBe('custom-env');
    expect(response.apps[1].name).toBe('Another Custom App');
  });

  it('should handle errors in get_apps gracefully', async () => {
    // Create a failing mock client
    const failingClient = createMockAppsignalClient();
    failingClient.getApps = vi.fn().mockRejectedValue(new Error('Network error'));

    const registerTools = createRegisterTools(() => failingClient);
    registerTools(mockServer);
    const tool = registeredTools.get('get_apps');
    const result = await tool.handler({});

    expect(result.content[0].text).toContain('Error fetching apps: Network error');
  });

  it('should return error when no app ID is selected', async () => {
    delete process.env.APPSIGNAL_APP_ID;
    vi.mocked(getSelectedAppId).mockReturnValue(undefined);

    const mockClient = createMockAppsignalClient();
    const registerTools = createRegisterTools(() => mockClient);
    registerTools(mockServer);
    const tool = registeredTools.get('get_exception_incident');
    const result = await tool.handler({ incidentId: 'exception-123' });

    expect(result.content[0].text).toContain('Error: No app ID selected');
    expect(result.content[0].text).toContain('Please use select_app_id tool first');
  });
});
