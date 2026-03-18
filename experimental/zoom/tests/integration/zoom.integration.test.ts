import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'path';
import { fileURLToPath } from 'url';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('Zoom MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  beforeEach(async () => {
    const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        ZOOM_MOCK_DATA: JSON.stringify({
          meetings: [
            {
              id: 111222333,
              uuid: 'int-uuid-1',
              topic: 'Integration Test Meeting',
              type: 2,
              start_time: '2025-02-01T09:00:00Z',
              duration: 60,
              timezone: 'UTC',
              join_url: 'https://zoom.us/j/111222333',
              status: 'waiting',
            },
          ],
          recordings: [
            {
              uuid: 'int-rec-uuid-1',
              id: 111222333,
              topic: 'Integration Test Recording',
              start_time: '2025-01-30T15:00:00Z',
              duration: 30,
              total_size: 52428800,
              recording_count: 1,
              recording_files: [
                {
                  id: 'int-file-1',
                  meeting_id: '111222333',
                  recording_start: '2025-01-30T15:00:00Z',
                  recording_end: '2025-01-30T15:30:00Z',
                  file_type: 'MP4',
                  file_size: 52428800,
                  download_url: 'https://zoom.us/rec/download/int-mock-1',
                  status: 'completed',
                  recording_type: 'shared_screen_with_speaker_view',
                },
              ],
            },
          ],
        }),
      },
      debug: false,
    });

    await client.connect();
  });

  afterEach(async () => {
    if (client) {
      await client.disconnect();
      client = null;
    }
  });

  it('should list tools', async () => {
    const result = await client!.listTools();
    const toolNames = result.tools.map((t: { name: string }) => t.name);

    expect(toolNames).toContain('list_meetings');
    expect(toolNames).toContain('get_meeting');
    expect(toolNames).toContain('list_recordings');
  });

  it('should list meetings via MCP', async () => {
    const result = await client!.callTool('list_meetings', {});

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Integration Test Meeting');
    expect(text).toContain('111222333');
  });

  it('should get a specific meeting via MCP', async () => {
    const result = await client!.callTool('get_meeting', {
      meeting_id: '111222333',
    });

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Integration Test Meeting');
  });

  it('should list recordings via MCP', async () => {
    const result = await client!.callTool('list_recordings', {});

    expect(result.isError).toBeFalsy();
    const text = (result.content as Array<{ type: string; text: string }>)[0].text;
    expect(text).toContain('Integration Test Recording');
    expect(text).toContain('MP4');
  });
});
