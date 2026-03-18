/**
 * Functional tests that mock ONLY the Zoom API (global.fetch).
 *
 * Everything else runs as real code: ZoomClient, tool handlers,
 * Zod validation, output formatting, createMCPServer, registerHandlers.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { ZoomClient } from '../../shared/src/server.js';
import { listMeetingsTool } from '../../shared/src/tools/list-meetings.js';
import { getMeetingTool } from '../../shared/src/tools/get-meeting.js';
import { listRecordingsTool } from '../../shared/src/tools/list-recordings.js';

const TEST_TOKEN = 'test-access-token';

function mockFetchResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    statusText: status === 200 ? 'OK' : 'Error',
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('Zoom API Functional Tests (fetch mocked)', () => {
  const server = new Server({ name: 'test', version: '1.0' }, { capabilities: { tools: {} } });
  let fetchSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    fetchSpy = vi.spyOn(global, 'fetch');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('list_meetings through real ZoomClient', () => {
    it('should list meetings and format output correctly', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          page_size: 30,
          total_records: 2,
          next_page_token: '',
          meetings: [
            {
              id: 111,
              uuid: 'uuid-1',
              topic: 'Daily Standup',
              type: 2,
              start_time: '2025-03-01T09:00:00Z',
              duration: 15,
              timezone: 'America/New_York',
              join_url: 'https://zoom.us/j/111',
              status: 'waiting',
            },
            {
              id: 222,
              uuid: 'uuid-2',
              topic: 'Sprint Review',
              type: 2,
              start_time: '2025-03-07T14:00:00Z',
              duration: 60,
              timezone: 'America/New_York',
              join_url: 'https://zoom.us/j/222',
              status: 'waiting',
            },
          ],
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listMeetingsTool(server, () => client);
      const response = await tool.handler({});

      // Verify the fetch was called with correct URL and auth
      expect(fetchSpy).toHaveBeenCalledOnce();
      const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
      expect(url).toContain('https://api.zoom.us/v2/users/me/meetings');
      expect(options.headers).toMatchObject({
        Authorization: `Bearer ${TEST_TOKEN}`,
      });

      // Verify output formatting from real tool handler
      const text = response.content[0].text;
      expect(text).toContain('Found 2 meetings');
      expect(text).toContain('Daily Standup');
      expect(text).toContain('Sprint Review');
      expect(text).toContain('https://zoom.us/j/111');
    });

    it('should pass type filter as query parameter to Zoom API', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          page_size: 30,
          total_records: 0,
          next_page_token: '',
          meetings: [],
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listMeetingsTool(server, () => client);
      await tool.handler({ type: 'live' });

      const [url] = fetchSpy.mock.calls[0] as [string];
      expect(url).toContain('type=live');
    });

    it('should pass page_size as query parameter to Zoom API', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          page_size: 10,
          total_records: 0,
          next_page_token: '',
          meetings: [],
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listMeetingsTool(server, () => client);
      await tool.handler({ page_size: 10 });

      const [url] = fetchSpy.mock.calls[0] as [string];
      expect(url).toContain('page_size=10');
    });

    it('should handle Zoom API 401 unauthorized error', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 124, message: 'Invalid access token.' }), {
          status: 401,
          statusText: 'Unauthorized',
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listMeetingsTool(server, () => client);
      const response = await tool.handler({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('401');
      expect(response.content[0].text).toContain('Invalid access token');
    });

    it('should handle Zoom API 429 rate limit error', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(JSON.stringify({ code: 429, message: 'Rate limit exceeded' }), {
          status: 429,
          statusText: 'Too Many Requests',
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listMeetingsTool(server, () => client);
      const response = await tool.handler({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('429');
    });

    it('should handle empty meeting list from API', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          page_size: 30,
          total_records: 0,
          next_page_token: '',
          meetings: [],
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listMeetingsTool(server, () => client);
      const response = await tool.handler({});

      expect(response.content[0].text).toContain('No meetings found');
    });
  });

  describe('get_meeting through real ZoomClient', () => {
    it('should get meeting details and format output', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          id: 999,
          uuid: 'meeting-uuid-999',
          topic: 'Architecture Review',
          type: 2,
          start_time: '2025-03-15T10:00:00Z',
          duration: 90,
          timezone: 'US/Pacific',
          join_url: 'https://zoom.us/j/999',
          status: 'waiting',
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = getMeetingTool(server, () => client);
      const response = await tool.handler({ meeting_id: '999' });

      // Verify fetch URL includes the meeting ID
      const [url] = fetchSpy.mock.calls[0] as [string];
      expect(url).toBe('https://api.zoom.us/v2/meetings/999');

      // Verify output
      const text = response.content[0].text;
      expect(text).toContain('Architecture Review');
      expect(text).toContain('999');
      expect(text).toContain('90 minutes');
      expect(text).toContain('US/Pacific');
    });

    it('should URL-encode meeting IDs with special characters', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          id: 123,
          uuid: 'abc//def==',
          topic: 'Test',
          type: 2,
          start_time: '2025-03-15T10:00:00Z',
          duration: 30,
          timezone: 'UTC',
          join_url: 'https://zoom.us/j/123',
          status: 'waiting',
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = getMeetingTool(server, () => client);
      await tool.handler({ meeting_id: 'abc//def==' });

      const [url] = fetchSpy.mock.calls[0] as [string];
      // The meeting ID should be URL-encoded
      expect(url).toBe(`https://api.zoom.us/v2/meetings/${encodeURIComponent('abc//def==')}`);
      expect(url).not.toContain('//def');
    });

    it('should handle Zoom API 404 meeting not found', async () => {
      fetchSpy.mockResolvedValueOnce(
        new Response(
          JSON.stringify({ code: 3001, message: 'Meeting does not exist: 999999999.' }),
          { status: 404, statusText: 'Not Found' }
        )
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = getMeetingTool(server, () => client);
      const response = await tool.handler({ meeting_id: '999999999' });

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('404');
      expect(response.content[0].text).toContain('Meeting does not exist');
    });

    it('should fail validation when meeting_id is missing', async () => {
      const client = new ZoomClient(TEST_TOKEN);
      const tool = getMeetingTool(server, () => client);
      const response = await tool.handler({});

      expect(response.isError).toBe(true);
      // fetch should NOT have been called — Zod validation rejects first
      expect(fetchSpy).not.toHaveBeenCalled();
    });
  });

  describe('list_recordings through real ZoomClient', () => {
    it('should list recordings with download URLs in output', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          from: '2025-02-01',
          to: '2025-03-01',
          page_size: 30,
          total_records: 1,
          next_page_token: '',
          meetings: [
            {
              uuid: 'rec-uuid-1',
              id: 555,
              topic: 'Weekly Sync Recording',
              start_time: '2025-02-20T10:00:00Z',
              duration: 45,
              total_size: 104857600,
              recording_count: 2,
              recording_files: [
                {
                  id: 'file-1',
                  meeting_id: '555',
                  recording_start: '2025-02-20T10:00:00Z',
                  recording_end: '2025-02-20T10:45:00Z',
                  file_type: 'MP4',
                  file_size: 52428800,
                  download_url: 'https://zoom.us/rec/download/abc123',
                  status: 'completed',
                  recording_type: 'shared_screen_with_speaker_view',
                },
                {
                  id: 'file-2',
                  meeting_id: '555',
                  recording_start: '2025-02-20T10:00:00Z',
                  recording_end: '2025-02-20T10:45:00Z',
                  file_type: 'TRANSCRIPT',
                  file_size: 2048,
                  download_url: 'https://zoom.us/rec/download/def456',
                  status: 'completed',
                  recording_type: 'audio_transcript',
                },
              ],
            },
          ],
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listRecordingsTool(server, () => client);
      const response = await tool.handler({});

      const text = response.content[0].text;
      expect(text).toContain('Found 1 recorded meetings');
      expect(text).toContain('Weekly Sync Recording');
      expect(text).toContain('MP4');
      expect(text).toContain('TRANSCRIPT');
      expect(text).toContain('https://zoom.us/rec/download/abc123');
      expect(text).toContain('https://zoom.us/rec/download/def456');
    });

    it('should pass date range as query parameters to Zoom API', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          from: '2025-01-01',
          to: '2025-01-31',
          page_size: 30,
          total_records: 0,
          next_page_token: '',
          meetings: [],
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listRecordingsTool(server, () => client);
      await tool.handler({ from: '2025-01-01', to: '2025-01-31' });

      const [url] = fetchSpy.mock.calls[0] as [string];
      expect(url).toContain('from=2025-01-01');
      expect(url).toContain('to=2025-01-31');
    });

    it('should handle network failure gracefully', async () => {
      fetchSpy.mockRejectedValueOnce(new Error('Network error: DNS resolution failed'));

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listRecordingsTool(server, () => client);
      const response = await tool.handler({});

      expect(response.isError).toBe(true);
      expect(response.content[0].text).toContain('Network error');
    });

    it('should handle empty recordings from API', async () => {
      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          from: '2025-03-01',
          to: '2025-03-18',
          page_size: 30,
          total_records: 0,
          next_page_token: '',
          meetings: [],
        })
      );

      const client = new ZoomClient(TEST_TOKEN);
      const tool = listRecordingsTool(server, () => client);
      const response = await tool.handler({});

      expect(response.content[0].text).toContain('No recordings found');
    });
  });

  describe('createMCPServer and registerHandlers', () => {
    it('should register handlers without errors using a real ZoomClient factory', async () => {
      const { createMCPServer } = await import('../../shared/src/server.js');

      fetchSpy.mockResolvedValueOnce(
        mockFetchResponse({
          page_size: 30,
          total_records: 1,
          next_page_token: '',
          meetings: [
            {
              id: 777,
              uuid: 'full-stack-uuid',
              topic: 'Full Stack Test Meeting',
              type: 2,
              start_time: '2025-03-18T12:00:00Z',
              duration: 30,
              timezone: 'UTC',
              join_url: 'https://zoom.us/j/777',
              status: 'waiting',
            },
          ],
        })
      );

      const { server: mcpServer, registerHandlers } = createMCPServer({ version: '1.0.0' });

      // registerHandlers wires up ListToolsRequest and CallToolRequest handlers.
      // MCP-level dispatch is verified in integration tests via TestMCPClient;
      // here we verify the registration itself succeeds with a real client factory.
      const clientFactory = () => new ZoomClient(TEST_TOKEN);
      await registerHandlers(mcpServer, clientFactory);
      expect(mcpServer).toBeDefined();

      // Verify the same factory produces a working tool
      const tool = listMeetingsTool(mcpServer, clientFactory);
      const response = await tool.handler({});
      expect(response.content[0].text).toContain('Full Stack Test Meeting');
    });
  });
});
