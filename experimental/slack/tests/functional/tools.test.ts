import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createMockSlackClient } from '../mocks/slack-client.functional-mock.js';
import { getChannelsTool } from '../../shared/src/tools/get-channels.js';
import { getChannelTool } from '../../shared/src/tools/get-channel.js';
import { getThreadTool } from '../../shared/src/tools/get-thread.js';
import { postMessageTool } from '../../shared/src/tools/post-message.js';
import { replyToThreadTool } from '../../shared/src/tools/reply-to-thread.js';
import { updateMessageTool } from '../../shared/src/tools/update-message.js';
import { reactToMessageTool } from '../../shared/src/tools/react-to-message.js';
import { downloadFileTool } from '../../shared/src/tools/download-file.js';
import type { ISlackClient } from '../../shared/src/server.js';

describe('Slack MCP Server Tools', () => {
  let mockClient: ISlackClient;
  let mockServer: Server;

  beforeEach(() => {
    mockClient = createMockSlackClient();
    mockServer = {} as Server;
  });

  describe('slack_get_channels', () => {
    it('should list all channels', async () => {
      const tool = getChannelsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('Found 2 channel(s)');
      expect(result.content[0].text).toContain('#general');
      expect(result.content[0].text).toContain('#random');
      expect(result.content[0].text).toContain('C123456789');
      expect(mockClient.getChannels).toHaveBeenCalled();
    });

    it('should handle empty channel list', async () => {
      (mockClient.getChannels as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      const tool = getChannelsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.content[0].text).toContain('No channels found');
    });

    it('should handle errors', async () => {
      (mockClient.getChannels as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('API error')
      );
      const tool = getChannelsTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching channels');
    });
  });

  describe('slack_get_channel', () => {
    it('should get channel info with messages', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);
      const result = await tool.handler({ channel_id: 'C123456789' });

      expect(result.content[0].text).toContain('# Channel: #general');
      expect(result.content[0].text).toContain('Topic: General discussion');
      expect(result.content[0].text).toContain('Members: 10');
      expect(result.content[0].text).toContain('Hello world');
      expect(mockClient.getChannel).toHaveBeenCalledWith('C123456789');
      expect(mockClient.getMessages).toHaveBeenCalled();
    });

    it('should display attachment info for unfurled links', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);
      const result = await tool.handler({ channel_id: 'C123456789' });

      expect(result.content[0].text).toContain('Attachment:');
      expect(result.content[0].text).toContain('[Example Article](https://example.com/article)');
      expect(result.content[0].text).toContain('An interesting article about testing');
      expect(result.content[0].text).toContain('Image: https://example.com/preview.png');
    });

    it('should display file info with ID and download hint', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);
      const result = await tool.handler({ channel_id: 'C123456789' });

      expect(result.content[0].text).toContain('File:');
      expect(result.content[0].text).toContain('screenshot.png');
      expect(result.content[0].text).toContain('image/png');
      expect(result.content[0].text).toContain('id: F123456789');
      expect(result.content[0].text).toContain('use slack_download_file to download');
      expect(result.content[0].text).not.toContain('Link: https://slack.com/files/screenshot.png');
    });

    it('should get channel info without messages when requested', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);
      const result = await tool.handler({
        channel_id: 'C123456789',
        include_messages: false,
      });

      expect(result.content[0].text).toContain('# Channel: #general');
      expect(result.content[0].text).not.toContain('## Recent Messages');
      expect(mockClient.getMessages).not.toHaveBeenCalled();
    });

    it('should require channel_id parameter', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });
  });

  describe('slack_get_thread', () => {
    it('should get thread with replies', async () => {
      const tool = getThreadTool(mockServer, () => mockClient);
      const result = await tool.handler({
        channel_id: 'C123456789',
        thread_ts: '1234567890.123456',
      });

      expect(result.content[0].text).toContain('## Parent Message');
      expect(result.content[0].text).toContain('Parent message');
      expect(result.content[0].text).toContain('## Replies (2)');
      expect(result.content[0].text).toContain('First reply');
      expect(result.content[0].text).toContain('Second reply');
      expect(mockClient.getThread).toHaveBeenCalledWith(
        'C123456789',
        '1234567890.123456',
        expect.any(Object)
      );
    });

    it('should display attachments in parent and reply messages', async () => {
      const tool = getThreadTool(mockServer, () => mockClient);
      const result = await tool.handler({
        channel_id: 'C123456789',
        thread_ts: '1234567890.123456',
      });

      // Parent message attachment (unfurled GitHub link)
      expect(result.content[0].text).toContain('[GitHub PR](https://github.com/org/repo/pull/1)');
      expect(result.content[0].text).toContain('Thumbnail: https://github.com/thumb.png');

      // Reply with file (shows ID and download hint, not URL)
      expect(result.content[0].text).toContain('report.pdf');
      expect(result.content[0].text).toContain('application/pdf');
      expect(result.content[0].text).toContain('id: F987654321');
      expect(result.content[0].text).toContain('use slack_download_file to download');
    });

    it('should require channel_id and thread_ts', async () => {
      const tool = getThreadTool(mockServer, () => mockClient);
      const result = await tool.handler({ channel_id: 'C123456789' });

      expect(result.isError).toBe(true);
    });
  });

  describe('slack_post_message', () => {
    it('should post a message', async () => {
      const tool = postMessageTool(mockServer, () => mockClient);
      const result = await tool.handler({
        channel_id: 'C123456789',
        text: 'Hello from test!',
      });

      expect(result.content[0].text).toContain('Message posted successfully');
      expect(result.content[0].text).toContain('Hello from test!');
      expect(mockClient.postMessage).toHaveBeenCalledWith('C123456789', 'Hello from test!');
    });

    it('should require channel_id and text', async () => {
      const tool = postMessageTool(mockServer, () => mockClient);
      const result = await tool.handler({ channel_id: 'C123456789' });

      expect(result.isError).toBe(true);
    });
  });

  describe('slack_reply_to_thread', () => {
    it('should reply to a thread', async () => {
      const tool = replyToThreadTool(mockServer, () => mockClient);
      const result = await tool.handler({
        channel_id: 'C123456789',
        thread_ts: '1234567890.123456',
        text: 'This is a reply',
      });

      expect(result.content[0].text).toContain('Reply posted successfully');
      expect(result.content[0].text).toContain('Thread: 1234567890.123456');
      expect(mockClient.postMessage).toHaveBeenCalledWith(
        'C123456789',
        'This is a reply',
        expect.objectContaining({ threadTs: '1234567890.123456' })
      );
    });

    it('should support broadcast option', async () => {
      const tool = replyToThreadTool(mockServer, () => mockClient);
      await tool.handler({
        channel_id: 'C123456789',
        thread_ts: '1234567890.123456',
        text: 'Broadcast reply',
        broadcast: true,
      });

      expect(mockClient.postMessage).toHaveBeenCalledWith(
        'C123456789',
        'Broadcast reply',
        expect.objectContaining({ replyBroadcast: true })
      );
    });
  });

  describe('slack_update_message', () => {
    it('should update a message', async () => {
      const tool = updateMessageTool(mockServer, () => mockClient);
      const result = await tool.handler({
        channel_id: 'C123456789',
        message_ts: '1234567890.123456',
        text: 'Updated content',
      });

      expect(result.content[0].text).toContain('Message updated successfully');
      expect(result.content[0].text).toContain('Updated content');
      expect(mockClient.updateMessage).toHaveBeenCalledWith(
        'C123456789',
        '1234567890.123456',
        'Updated content'
      );
    });
  });

  describe('slack_react_to_message', () => {
    it('should add a reaction', async () => {
      const tool = reactToMessageTool(mockServer, () => mockClient);
      const result = await tool.handler({
        channel_id: 'C123456789',
        message_ts: '1234567890.123456',
        emoji: 'thumbsup',
      });

      expect(result.content[0].text).toContain('Reaction added successfully');
      expect(result.content[0].text).toContain(':thumbsup:');
      expect(mockClient.addReaction).toHaveBeenCalledWith(
        'C123456789',
        '1234567890.123456',
        'thumbsup'
      );
    });

    it('should strip colons from emoji name', async () => {
      const tool = reactToMessageTool(mockServer, () => mockClient);
      await tool.handler({
        channel_id: 'C123456789',
        message_ts: '1234567890.123456',
        emoji: ':thumbsup:',
      });

      expect(mockClient.addReaction).toHaveBeenCalledWith(
        'C123456789',
        '1234567890.123456',
        'thumbsup'
      );
    });
  });

  describe('slack_download_file', () => {
    it('should download a file and return local path', async () => {
      const tool = downloadFileTool(mockServer, () => mockClient);
      const result = await tool.handler({ file_id: 'F123456789' });

      expect(result.content[0].text).toContain('File downloaded successfully');
      expect(result.content[0].text).toContain('screenshot.png');
      expect(result.content[0].text).toContain('file://');
      expect(result.content[0].text).toContain('F123456789');
      expect(mockClient.getFileInfo).toHaveBeenCalledWith('F123456789');
      expect(mockClient.downloadFile).toHaveBeenCalledWith(
        'https://files.slack.com/files-pri/T123/download/screenshot.png'
      );
    });

    it('should require file_id parameter', async () => {
      const tool = downloadFileTool(mockServer, () => mockClient);
      const result = await tool.handler({});

      expect(result.isError).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      (mockClient.getFileInfo as ReturnType<typeof vi.fn>).mockRejectedValue(
        new Error('file_not_found')
      );
      const tool = downloadFileTool(mockServer, () => mockClient);
      const result = await tool.handler({ file_id: 'F000000000' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error downloading file');
    });
  });
});
