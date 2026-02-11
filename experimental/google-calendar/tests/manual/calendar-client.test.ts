import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Manual tests for Google Calendar MCP Server
 *
 * These tests run against the real Google Calendar API via the MCP server.
 * They exercise the full pipeline: MCP protocol -> tool handler -> Calendar client -> Google Calendar API.
 *
 * To run them:
 *
 * 1. Create a .env file in the google-calendar/ directory with:
 *    GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL=...
 *    GCAL_SERVICE_ACCOUNT_PRIVATE_KEY=...
 *    GCAL_IMPERSONATE_EMAIL=...
 *
 * 2. Run: npm run test:manual
 */
describe('Google Calendar Client - Manual Tests', () => {
  let client: TestMCPClient;

  beforeAll(async () => {
    const clientEmail = process.env.GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL;
    const privateKey = process.env.GCAL_SERVICE_ACCOUNT_PRIVATE_KEY;
    const impersonateEmail = process.env.GCAL_IMPERSONATE_EMAIL;

    if (!clientEmail || !privateKey || !impersonateEmail) {
      throw new Error(
        'Google Calendar authentication not configured. Set GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL, ' +
          'GCAL_SERVICE_ACCOUNT_PRIVATE_KEY, and GCAL_IMPERSONATE_EMAIL in .env file.'
      );
    }

    const serverPath = path.join(__dirname, '../../local/build/index.js');
    client = new TestMCPClient({
      serverPath,
      env: {
        GCAL_SERVICE_ACCOUNT_CLIENT_EMAIL: clientEmail,
        GCAL_SERVICE_ACCOUNT_PRIVATE_KEY: privateKey,
        GCAL_IMPERSONATE_EMAIL: impersonateEmail,
      },
      debug: false,
    });

    await client.connect();
  });

  afterAll(async () => {
    if (client) {
      await client.disconnect();
    }
  });

  it('should list calendars', async () => {
    const result = await client.callTool('list_calendars', { max_results: 10 });
    expect(result.isError).toBeFalsy();

    const text = (result.content[0] as { text: string }).text;
    expect(text).toBeDefined();
    // The tool returns markdown with "# Available Calendars" or "No calendars found."
    // A successful result with calendars should contain the heading
    expect(text).toContain('Calendar');
    console.log(`list_calendars response length: ${text.length} chars`);
  });

  it('should list events from primary calendar', async () => {
    const now = new Date();
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    const result = await client.callTool('list_calendar_events', {
      calendar_id: 'primary',
      time_min: now.toISOString(),
      time_max: oneMonthFromNow.toISOString(),
      max_results: 10,
      single_events: true,
      order_by: 'startTime',
    });
    expect(result.isError).toBeFalsy();

    const text = (result.content[0] as { text: string }).text;
    expect(text).toBeDefined();
    console.log(`list_calendar_events response length: ${text.length} chars`);

    // Response is either "No events found" or markdown with event details
    if (text.includes('Event ID:')) {
      console.log('Found event(s) in response');
    } else {
      console.log('No events found in the time range');
    }
  });

  it('should get a specific event', async () => {
    // First list events to get an event ID
    const listResult = await client.callTool('list_calendar_events', {
      calendar_id: 'primary',
      max_results: 1,
      single_events: true,
    });
    expect(listResult.isError).toBeFalsy();

    const listText = (listResult.content[0] as { text: string }).text;

    // Extract event ID from the markdown output
    const eventIdMatch = listText.match(/\*\*Event ID:\*\*\s+(\S+)/);
    if (!eventIdMatch) {
      console.log('No events available to test with');
      return;
    }

    const eventId = eventIdMatch[1];
    const result = await client.callTool('get_calendar_event', {
      calendar_id: 'primary',
      event_id: eventId,
    });
    expect(result.isError).toBeFalsy();

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Event Details');
    expect(text).toContain(eventId);
    console.log(`Retrieved event: ${eventId}`);
  });

  it('should query freebusy information', async () => {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const result = await client.callTool('query_calendar_freebusy', {
      time_min: now.toISOString(),
      time_max: tomorrow.toISOString(),
      calendar_ids: ['primary'],
    });
    expect(result.isError).toBeFalsy();

    const text = (result.content[0] as { text: string }).text;
    expect(text).toContain('Free/Busy Information');
    expect(text).toContain('primary');
    console.log(`query_calendar_freebusy response length: ${text.length} chars`);
  });

  it('should create an event with a file attachment', async () => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // Use a public URL as an attachment
    const testAttachmentUrl =
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    const createResult = await client.callTool('create_calendar_event', {
      calendar_id: 'primary',
      summary: `MCP Test Event with Attachment - ${now.toISOString()}`,
      description: 'Test event created by MCP manual tests to verify attachment functionality',
      start_datetime: now.toISOString(),
      end_datetime: oneHourFromNow.toISOString(),
      attachments: [
        {
          file_url: testAttachmentUrl,
          title: 'Test PDF Attachment',
        },
      ],
    });
    expect(createResult.isError).toBeFalsy();

    const createText = (createResult.content[0] as { text: string }).text;
    expect(createText).toContain('Event Created Successfully');
    expect(createText).toContain('MCP Test Event with Attachment');

    // Extract event ID for cleanup
    const eventIdMatch = createText.match(/\*\*Event ID:\*\*\s+(\S+)/);
    expect(eventIdMatch).not.toBeNull();
    const eventId = eventIdMatch![1];
    console.log(`Created event with ID: ${eventId}`);

    if (createText.includes('Attachments:')) {
      console.log('Event has attachment(s)');
    }

    // Clean up - delete the test event
    const deleteResult = await client.callTool('delete_calendar_event', {
      calendar_id: 'primary',
      event_id: eventId,
    });
    expect(deleteResult.isError).toBeFalsy();
    console.log('Test event deleted');
  });

  it('should update an event to add an attachment', async () => {
    const now = new Date();
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000);

    // First create an event without attachments
    const createResult = await client.callTool('create_calendar_event', {
      calendar_id: 'primary',
      summary: `MCP Test Event for Update - ${now.toISOString()}`,
      description: 'Test event to verify updating with attachments',
      start_datetime: now.toISOString(),
      end_datetime: oneHourFromNow.toISOString(),
    });
    expect(createResult.isError).toBeFalsy();

    const createText = (createResult.content[0] as { text: string }).text;
    const eventIdMatch = createText.match(/\*\*Event ID:\*\*\s+(\S+)/);
    expect(eventIdMatch).not.toBeNull();
    const eventId = eventIdMatch![1];
    console.log(`Created event with ID: ${eventId}`);

    // Now update it with an attachment
    const testAttachmentUrl =
      'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

    const updateResult = await client.callTool('update_calendar_event', {
      calendar_id: 'primary',
      event_id: eventId,
      attachments: [
        {
          file_url: testAttachmentUrl,
          title: 'Added PDF Attachment',
        },
      ],
    });
    expect(updateResult.isError).toBeFalsy();

    const updateText = (updateResult.content[0] as { text: string }).text;
    expect(updateText).toContain('Event Updated Successfully');
    console.log(`Updated event response length: ${updateText.length} chars`);

    if (updateText.includes('Attachments:')) {
      console.log('Updated event has attachment(s)');
    }

    // Clean up - delete the test event
    const deleteResult = await client.callTool('delete_calendar_event', {
      calendar_id: 'primary',
      event_id: eventId,
    });
    expect(deleteResult.isError).toBeFalsy();
    console.log('Test event deleted');
  });
});
