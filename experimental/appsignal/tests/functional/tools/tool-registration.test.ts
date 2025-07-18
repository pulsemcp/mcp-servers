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
import { registerTools, createRegisterTools } from '../../../shared/src/tools';
import { getSelectedAppId, getEffectiveAppId, isAppIdLocked } from '../../../shared/src/state';
import { createMockAppsignalClient } from '../../mocks/appsignal-client.functional-mock';

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
    delete process.env.APPSIGNAL_APP_ID;

    // Reset mocks
    vi.clearAllMocks();

    // Default mock implementations
    vi.mocked(isAppIdLocked).mockReturnValue(false);
    vi.mocked(getEffectiveAppId).mockReturnValue(undefined);

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
  });

  afterEach(() => {
    delete process.env.APPSIGNAL_API_KEY;
    delete process.env.APPSIGNAL_APP_ID;
  });

  it('should register all tools when API key is provided', () => {
    registerTools(mockServer);

    expect(mockServer.tool).toHaveBeenCalledTimes(15);
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
    expect(registeredTools.has('get_performance_incidents')).toBe(true);
    expect(registeredTools.has('get_performance_incident')).toBe(true);
    expect(registeredTools.has('get_performance_incident_sample')).toBe(true);
    expect(registeredTools.has('get_performance_incident_sample_timeline')).toBe(true);
  });

  it('should throw error when API key is missing', () => {
    delete process.env.APPSIGNAL_API_KEY;

    expect(() => registerTools(mockServer)).toThrow(
      'APPSIGNAL_API_KEY environment variable must be configured'
    );
  });

  it('should disable main tools when no app ID is provided', () => {
    vi.mocked(getSelectedAppId).mockReturnValue(undefined);
    vi.mocked(getEffectiveAppId).mockReturnValue(undefined);
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
    const result = await tool.handler({ incidentNumber: 'exception-123' });

    expect(result.content[0].text).toContain('Error: No app ID configured');
    expect(result.content[0].text).toContain('Please use select_app_id tool first');
  });

  it('should NOT register app selection tools when app ID is locked via env var', () => {
    process.env.APPSIGNAL_APP_ID = 'test-app-id';
    vi.mocked(isAppIdLocked).mockReturnValue(true);
    vi.mocked(getEffectiveAppId).mockReturnValue('test-app-id');
    const registerTools = createRegisterTools(() => createMockAppsignalClient());

    registerTools(mockServer);

    // Check that app selection tools are NOT registered
    expect(registeredTools.has('get_apps')).toBe(false);
    expect(registeredTools.has('select_app_id')).toBe(false);
    expect(registeredTools.has('change_app_id')).toBe(false);

    // Check that main tools are enabled
    expect(registeredTools.get('get_exception_incident').enabled).toBe(true);
    expect(registeredTools.get('search_logs').enabled).toBe(true);
  });
});
