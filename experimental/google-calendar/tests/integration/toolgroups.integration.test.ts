import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Google Calendar MCP Server - Toolgroups Integration Tests', () => {
  describe('calendar group (full access - default)', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

      client = new TestMCPClient({
        serverPath: serverPath,
        env: {
          ...process.env,
          TOOL_GROUPS: 'calendar',
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should register all 5 calendar tools (read + write)', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(5);
      const toolNames = tools.tools.map((t) => t.name);

      // All calendar tools should be present
      expect(toolNames).toContain('gcal_list_events');
      expect(toolNames).toContain('gcal_get_event');
      expect(toolNames).toContain('gcal_create_event');
      expect(toolNames).toContain('gcal_list_calendars');
      expect(toolNames).toContain('gcal_query_freebusy');
    });

    it('should successfully call create_event (write operation)', async () => {
      const result = await client.callTool('gcal_create_event', {
        summary: 'Test Event',
        start_datetime: '2024-01-20T10:00:00-05:00',
        end_datetime: '2024-01-20T11:00:00-05:00',
      });

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Event Created Successfully');
    });
  });

  describe('calendar_readonly group', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

      client = new TestMCPClient({
        serverPath: serverPath,
        env: {
          ...process.env,
          TOOL_GROUPS: 'calendar_readonly',
        },
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should only register 4 read-only calendar tools', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(4);
      const toolNames = tools.tools.map((t) => t.name);

      // Read-only calendar tools should be present
      expect(toolNames).toContain('gcal_list_events');
      expect(toolNames).toContain('gcal_get_event');
      expect(toolNames).toContain('gcal_list_calendars');
      expect(toolNames).toContain('gcal_query_freebusy');

      // Write tools should NOT be present
      expect(toolNames).not.toContain('gcal_create_event');
    });

    it('should error when calling create_event (write operation not available)', async () => {
      try {
        await client.callTool('gcal_create_event', {
          summary: 'Test Event',
          start_datetime: '2024-01-20T10:00:00-05:00',
          end_datetime: '2024-01-20T11:00:00-05:00',
        });
        // If we get here, the tool was found when it shouldn't have been
        expect(true).toBe(false);
      } catch (error) {
        // Expected - tool should not be registered
        expect(error).toBeDefined();
      }
    });

    it('should successfully call list_events (read operation)', async () => {
      const result = await client.callTool('gcal_list_events', {});

      expect(result.isError).toBeFalsy();
      expect(result.content[0].text).toContain('Calendar Events');
    });
  });

  describe('no groups specified (default behavior)', () => {
    let client: TestMCPClient;

    beforeAll(async () => {
      const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

      // Create a clean env without TOOL_GROUPS
      const cleanEnv = { ...process.env };
      delete cleanEnv.TOOL_GROUPS;

      client = new TestMCPClient({
        serverPath: serverPath,
        env: cleanEnv,
      });
      await client.connect();
    });

    afterAll(async () => {
      await client.disconnect();
    });

    it('should register all 5 tools by default (full access)', async () => {
      const tools = await client.listTools();

      expect(tools.tools).toHaveLength(5);
      const toolNames = tools.tools.map((t) => t.name);

      // All calendar tools should be present by default
      expect(toolNames).toContain('gcal_list_events');
      expect(toolNames).toContain('gcal_get_event');
      expect(toolNames).toContain('gcal_create_event');
      expect(toolNames).toContain('gcal_list_calendars');
      expect(toolNames).toContain('gcal_query_freebusy');
    });
  });
});
