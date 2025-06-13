import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerTools, createRegisterTools } from '../../shared/src/tools';
import { setSelectedAppId, getSelectedAppId } from '../../shared/src/state';
import { createMockAppsignalClient } from '../mocks/appsignal-client.functional-mock';

// Mock the state module
vi.mock('../../shared/src/state', () => ({
  setSelectedAppId: vi.fn(),
  getSelectedAppId: vi.fn(),
}));

describe('AppSignal MCP Tools', () => {
  let mockServer: McpServer;
  let registeredTools: Map<string, any>;

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
    } as any;
  });

  afterEach(() => {
    delete process.env.APPSIGNAL_API_KEY;
    delete process.env.APPSIGNAL_APP_ID;
  });

  describe('Tool Registration', () => {
    it('should register all tools when API key is provided', () => {
      registerTools(mockServer);

      expect(mockServer.tool).toHaveBeenCalledTimes(6);
      expect(registeredTools.has('get_apps')).toBe(true);
      expect(registeredTools.has('select_app_id')).toBe(true);
      expect(registeredTools.has('get_exception_incident')).toBe(true);
      expect(registeredTools.has('get_exception_incident_samples')).toBe(true);
      expect(registeredTools.has('get_log_incident')).toBe(true);
      expect(registeredTools.has('search_logs')).toBe(true);
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
      expect(registeredTools.get('get_exception_incident_samples').enabled).toBe(false);
      expect(registeredTools.get('get_log_incident').enabled).toBe(false);
      expect(registeredTools.get('search_logs').enabled).toBe(false);

      // But app selection tools should be enabled
      expect(registeredTools.get('get_apps').enabled).toBe(true);
      expect(registeredTools.get('select_app_id').enabled).toBe(true);
    });
  });

  describe('Tool Execution', () => {
    beforeEach(() => {
      const registerTools = createRegisterTools(() => createMockAppsignalClient());
      registerTools(mockServer);
    });

    it('should handle get_exception_incident with valid app ID', async () => {
      const tool = registeredTools.get('get_exception_incident');
      const result = await tool.handler({ incidentId: 'exception-123' });

      const incidentData = JSON.parse(result.content[0].text);
      expect(incidentData.id).toBe('exception-123');
      expect(incidentData.status).toBe('open');
      expect(incidentData.name).toBe('NullPointerException');
    });

    it('should handle get_exception_incident_samples', async () => {
      const tool = registeredTools.get('get_exception_incident_samples');
      const result = await tool.handler({ incidentId: 'exception-123', limit: 5 });

      const samples = JSON.parse(result.content[0].text);
      expect(Array.isArray(samples)).toBe(true);
      expect(samples[0]).toHaveProperty('backtrace');
      expect(samples[0]).toHaveProperty('message');
    });

    it('should handle get_log_incident', async () => {
      const tool = registeredTools.get('get_log_incident');
      const result = await tool.handler({ incidentId: 'log-123' });

      const incidentData = JSON.parse(result.content[0].text);
      expect(incidentData.id).toBe('log-123');
      expect(incidentData.severity).toBe('error');
      expect(incidentData.name).toBe('High Error Rate');
    });

    it('should handle search_logs with parameters', async () => {
      const tool = registeredTools.get('search_logs');
      const result = await tool.handler({
        query: 'error level:critical',
        limit: 50,
        offset: 10,
      });

      const logs = JSON.parse(result.content[0].text);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs[0]).toHaveProperty('message');
      expect(logs[0].level).toBe('error');
    });

    it('should handle select_app_id and enable tools', async () => {
      // Start with tools disabled
      delete process.env.APPSIGNAL_APP_ID;
      vi.mocked(getSelectedAppId).mockReturnValue(undefined);

      // Re-register to get disabled state
      mockServer = {
        tool: vi.fn((name, schema, handler) => {
          const tool = { name, schema, handler, enabled: true };
          registeredTools.set(name, tool);
          return {
            enable: vi.fn(() => {
              tool.enabled = true;
            }),
            disable: vi.fn(() => {
              tool.enabled = false;
            }),
          };
        }),
      } as any;

      const registerTools = createRegisterTools(() => createMockAppsignalClient());
      registerTools(mockServer);

      // Verify main tools are disabled
      expect(registeredTools.get('get_exception_incident').enabled).toBe(false);

      // Call select_app_id
      const selectTool = registeredTools.get('select_app_id');
      await selectTool.handler({ appId: 'new-app-123' });

      // Verify setSelectedAppId was called
      expect(setSelectedAppId).toHaveBeenCalledWith('new-app-123');
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      const registerTools = createRegisterTools(() => createMockAppsignalClient());
      registerTools(mockServer);
    });

    it('should return error when no app ID is selected', async () => {
      delete process.env.APPSIGNAL_APP_ID;
      vi.mocked(getSelectedAppId).mockReturnValue(undefined);

      const tool = registeredTools.get('get_exception_incident');
      const result = await tool.handler({ incidentId: 'exception-123' });

      expect(result.content[0].text).toContain('Error: No app ID selected');
      expect(result.content[0].text).toContain('Please use select_app_id tool first');
    });
  });
});
