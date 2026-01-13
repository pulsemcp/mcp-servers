import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

describe('Google Calendar MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  beforeEach(async () => {
    client = new TestMCPClient({
      serverPath: join(__dirname, '../../local/build/index.integration-with-mock.js'),
    });
    await client.connect();
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should list available tools', async () => {
    const result = await client!.listTools();

    expect(result.tools).toBeDefined();
    expect(result.tools.length).toBe(5);

    const toolNames = result.tools.map((t) => t.name);
    expect(toolNames).toContain('gcal_list_events');
    expect(toolNames).toContain('gcal_get_event');
    expect(toolNames).toContain('gcal_create_event');
    expect(toolNames).toContain('gcal_list_calendars');
    expect(toolNames).toContain('gcal_query_freebusy');
  });

  it('should list events with default parameters', async () => {
    const result = await client!.callTool('gcal_list_events', {});

    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Calendar Events');
    expect(result.content[0].text).toContain('Team Standup');
  });

  it('should get a specific event', async () => {
    const result = await client!.callTool('gcal_get_event', {
      event_id: 'event1',
    });

    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Event Details');
    expect(result.content[0].text).toContain('Team Standup');
  });

  it('should create a new event', async () => {
    const result = await client!.callTool('gcal_create_event', {
      summary: 'Test Event',
      start_datetime: '2024-01-20T10:00:00-05:00',
      end_datetime: '2024-01-20T11:00:00-05:00',
    });

    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Event Created Successfully');
  });

  it('should list calendars', async () => {
    const result = await client!.callTool('gcal_list_calendars', {});

    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Available Calendars');
    expect(result.content[0].text).toContain('Primary Calendar');
  });

  it('should query freebusy information', async () => {
    const result = await client!.callTool('gcal_query_freebusy', {
      time_min: '2024-01-15T00:00:00Z',
      time_max: '2024-01-15T23:59:59Z',
      calendar_ids: ['primary'],
    });

    expect(result.content).toBeDefined();
    expect(result.content).toHaveLength(1);
    expect(result.content[0].text).toContain('Free/Busy Information');
  });

  it('should handle errors for invalid event ID', async () => {
    const result = await client!.callTool('gcal_get_event', {
      event_id: 'nonexistent',
    });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Error getting event');
  });
});
