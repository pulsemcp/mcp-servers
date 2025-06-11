import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('AppSignal MCP Server Integration Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    // Path to the integration build of the server
    const serverPath = path.join(__dirname, '../../local/build/src/index.integration.js');
    
    client = new TestMCPClient({
      serverPath,
      env: {
        APPSIGNAL_API_KEY: 'test-api-key',
        APPSIGNAL_APP_ID: 'test-app-id',
      },
      debug: true,
    });

    await client.connect();
  });

  afterAll(async () => {
    await client.disconnect();
  });

  describe('Tool Discovery', () => {
    it('should list all available tools', async () => {
      const tools = await client.listTools();
      
      expect(tools.tools).toBeDefined();
      expect(tools.tools).toHaveLength(5);
      
      const toolNames = tools.tools.map(t => t.name);
      expect(toolNames).toContain('get_app_ids');
      expect(toolNames).toContain('select_app_id');
      expect(toolNames).toContain('get_alert_details');
      expect(toolNames).toContain('search_logs');
      expect(toolNames).toContain('get_logs_in_datetime_range');
    });
  });

  describe('Search Logs Tool', () => {
    it('should search logs with a query', async () => {
      const result = await client.callTool('search_logs', {
        query: 'error',
        limit: 10,
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      expect(result.content[0]).toHaveProperty('type', 'text');
      
      const content = JSON.parse((result.content[0] as any).text);
      expect(Array.isArray(content)).toBe(true);
      expect(content.length).toBeGreaterThan(0);
      expect(content[0]).toHaveProperty('message');
      expect(content[0].message).toContain('Database connection failed');
    });

    it('should return empty results for non-matching query', async () => {
      const result = await client.callTool('search_logs', {
        query: 'nonexistent',
        limit: 10,
      });

      expect(result.isError).toBe(false);
      const content = JSON.parse((result.content[0] as any).text);
      expect(Array.isArray(content)).toBe(true);
      expect(content).toHaveLength(0);
    });
  });

  describe('Get Alert Details Tool', () => {
    it('should retrieve alert details by ID', async () => {
      const result = await client.callTool('get_alert_details', {
        alertId: 'alert-123',
      });

      expect(result.isError).toBe(false);
      expect(result.content).toHaveLength(1);
      
      const alert = JSON.parse((result.content[0] as any).text);
      expect(alert).toHaveProperty('id', 'alert-123');
      expect(alert).toHaveProperty('status', 'active');
      expect(alert).toHaveProperty('triggers');
      expect(alert.triggers).toHaveLength(1);
      expect(alert).toHaveProperty('affectedServices');
      expect(alert.affectedServices).toContain('api-service');
    });
  });

  describe('Get Logs in Date Range Tool', () => {
    it('should retrieve logs within a date range', async () => {
      const result = await client.callTool('get_logs_in_datetime_range', {
        start: '2024-01-15T09:00:00Z',
        end: '2024-01-15T11:00:00Z',
        limit: 50,
      });

      expect(result.isError).toBe(false);
      const logs = JSON.parse((result.content[0] as any).text);
      expect(Array.isArray(logs)).toBe(true);
      expect(logs.length).toBeGreaterThan(0);
      expect(logs[0]).toHaveProperty('timestamp');
      expect(logs[0]).toHaveProperty('message');
      expect(logs[0].message).toContain('Logs from');
    });
  });

  describe('App ID Management', () => {
    it('should list available app IDs', async () => {
      const result = await client.callTool('get_app_ids', {});

      expect(result.isError).toBe(false);
      const data = JSON.parse((result.content[0] as any).text);
      expect(data).toHaveProperty('appIds');
      expect(Array.isArray(data.appIds)).toBe(true);
      expect(data.appIds.length).toBeGreaterThan(0);
    });

    it('should select a different app ID', async () => {
      const result = await client.callTool('select_app_id', {
        appId: 'app-2',
      });

      expect(result.isError).toBe(false);
      expect((result.content[0] as any).text).toContain('Successfully selected app ID: app-2');
    });
  });
});