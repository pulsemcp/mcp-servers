import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { createFunctionalMockTwistClient } from '../mocks/twist-client.functional-mock.js';
import { getChannelsTool } from '../../shared/src/tools/get-channels.js';
import { getChannelTool } from '../../shared/src/tools/get-channel.js';
import { getThreadTool } from '../../shared/src/tools/get-thread.js';
import { createThreadTool } from '../../shared/src/tools/create-thread.js';
import { addMessageToThreadTool } from '../../shared/src/tools/add-message-to-thread.js';
import { closeThreadTool } from '../../shared/src/tools/close-thread.js';

describe('Twist Tools', () => {
  let mockClient: ReturnType<typeof createFunctionalMockTwistClient>;
  let mockServer: Server;

  beforeEach(() => {
    mockClient = createFunctionalMockTwistClient();
    mockServer = {} as Server; // Minimal mock server for testing
  });

  describe('get_channels', () => {
    it('should return formatted channel list', async () => {
      const tool = getChannelsTool(mockServer, () => mockClient);

      const result = await tool.handler({});

      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Found 1 active channels:'),
      });
      expect(result.content[0].text).toContain('#general (ID: ch_123) - General discussion');
    });

    it('should handle errors gracefully', async () => {
      mockClient.getChannels = vi.fn().mockRejectedValue(new Error('API Error'));
      const tool = getChannelsTool(mockServer, () => mockClient);

      const result = await tool.handler({});

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error fetching channels: API Error');
    });
  });

  describe('get_channel', () => {
    it('should return channel details with threads by default', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);

      const result = await tool.handler({ channel_id: 'ch_123' });

      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Channel Details:'),
      });
      expect(result.content[0].text).toContain('Name: #test-channel');
      expect(result.content[0].text).toContain('ID: ch_123');
      expect(result.content[0].text).toContain('Threads (1 open threads):');
      expect(result.content[0].text).toContain('"Test Thread" (ID: th_001)');
    });

    it('should return channel details without threads when include_threads is false', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);

      const result = await tool.handler({ channel_id: 'ch_123', include_threads: false });

      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Channel Details:'),
      });
      expect(result.content[0].text).toContain('Name: #test-channel');
      expect(result.content[0].text).not.toContain('Threads');
    });

    it('should handle empty thread list', async () => {
      mockClient.getThreads = vi.fn().mockResolvedValue([]);
      const tool = getChannelTool(mockServer, () => mockClient);

      const result = await tool.handler({ channel_id: 'ch_123' });

      expect(result.content[0].text).toContain('No threads found in this channel.');
    });

    it('should respect threads_limit parameter', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);

      await tool.handler({ channel_id: 'ch_123', threads_limit: 10 });

      expect(mockClient.getThreads).toHaveBeenCalledWith('ch_123', {
        limit: 10,
        newerThanTs: undefined,
      });
    });

    it('should validate input parameters', async () => {
      const tool = getChannelTool(mockServer, () => mockClient);

      await expect(tool.handler({})).rejects.toThrow();
    });
  });

  describe('get_thread', () => {
    it('should return thread with messages', async () => {
      const tool = getThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({ thread_id: 'th_001' });

      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Thread: "Test Thread"'),
      });
      expect(result.content[0].text).toContain('Messages (2 total):');
      expect(result.content[0].text).toContain('Test message');
    });

    it('should include thread content as the first message', async () => {
      const tool = getThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({ thread_id: 'th_001' });

      const responseText = result.content[0].text;
      
      // Should have 2 total messages (thread content + comment)
      expect(responseText).toContain('Messages (2 total):');
      
      // Should include the original thread content as the first message
      expect(responseText).toContain('This is the original thread content that starts the discussion');
      expect(responseText).toContain('Thread Creator:');
      
      // Should also include the comment message
      expect(responseText).toContain('Test message');
      expect(responseText).toContain('Test User:');
      
      // Thread content should appear before the comment (chronologically first)
      const threadContentIndex = responseText.indexOf('This is the original thread content');
      const commentIndex = responseText.indexOf('Test message');
      expect(threadContentIndex).toBeLessThan(commentIndex);
    });

    it('should handle thread with content but no comments', async () => {
      mockClient.getThread = vi.fn().mockResolvedValue({
        id: 'th_001',
        title: 'Thread with just content',
        channel_id: 'ch_123',
        workspace_id: '228287',
        creator: 'user_123',
        creator_name: 'Thread Creator',
        posted_ts: 1234567890,
        content: 'This thread has only the initial content, no comments yet',
        messages: [], // No comments
      });
      const tool = getThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({ thread_id: 'th_001' });
      const responseText = result.content[0].text;

      // Should have 1 total message (just the thread content)
      expect(responseText).toContain('Messages (1 total):');
      
      // Should include the thread content
      expect(responseText).toContain('This thread has only the initial content, no comments yet');
      expect(responseText).toContain('Thread Creator:');
    });

    it('should handle thread with no messages', async () => {
      mockClient.getThread = vi.fn().mockResolvedValue({
        id: 'th_001',
        title: 'Empty Thread',
        channel_id: 'ch_123',
        workspace_id: '228287',
        messages: [],
      });
      const tool = getThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({ thread_id: 'th_001' });

      expect(result.content[0].text).toContain('No messages in this thread yet.');
    });

    it('should display action buttons, attachments, reactions, and system messages', async () => {
      mockClient.getThread = vi.fn().mockResolvedValue({
        id: 'th_001',
        title: 'Rich Thread',
        channel_id: 'ch_123',
        workspace_id: '228287',
        messages: [
          {
            id: 'msg_001',
            thread_id: 'th_001',
            content: 'Message with all features',
            creator: 'user_123',
            created_ts: 1234567890,
            actions: [
              {
                action: 'open_url',
                type: 'action',
                button_text: 'Visit Website',
                url: 'https://example.com',
              },
              {
                action: 'prefill_message',
                type: 'action',
                button_text: 'Reply with template',
                message: 'Thanks for the update!',
              },
            ],
            attachments: [
              {
                attachment_id: 'att_001',
                title: 'screenshot.png',
                url: 'https://example.com/screenshot.png',
                url_type: 'image',
                file_name: 'screenshot.png',
                file_size: 102400,
                underlying_type: 'image/png',
                upload_state: 'uploaded',
                image: 'https://example.com/screenshot.png',
                image_width: 1920,
                image_height: 1080,
              },
            ],
            reactions: {
              '👍': [10001, 10002, 10003],
              '🎉': [10004],
            },
            system_message: {
              is_integration: false,
              initiator: 10001,
              initiator_name: 'John Doe',
              channel_id: 123,
              type: 'THREAD_MOVED',
              comment_id: 56288719,
              initiator_id: 10001,
              thread_id: 1409756,
              user_id: null,
              user_name: null,
              title: null,
              old_title: null,
              new_title: null,
              channel_name: 'New Channel',
              integration_name: null,
            },
          },
        ],
      });
      const tool = getThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({ thread_id: 'th_001' });
      const responseText = result.content[0].text;

      // Check action buttons
      expect(responseText).toContain('Action buttons:');
      expect(responseText).toContain('Visit Website (open_url) - URL: https://example.com');
      expect(responseText).toContain(
        'Reply with template (prefill_message) - Message: "Thanks for the update!"'
      );

      // Check attachments
      expect(responseText).toContain('Attachments:');
      expect(responseText).toContain('screenshot.png (image/png)');
      expect(responseText).toContain('Size: 102400 bytes');
      expect(responseText).toContain('Image: 1920x1080');

      // Check reactions
      expect(responseText).toContain('Reactions:');
      expect(responseText).toContain('👍: 3 users');
      expect(responseText).toContain('🎉: 1 user');

      // Check system message
      expect(responseText).toContain('System message:');
      expect(responseText).toContain('Type: THREAD_MOVED');
      expect(responseText).toContain('Initiator: John Doe (ID: 10001)');
      expect(responseText).toContain('Channel: New Channel');
    });
  });

  describe('create_thread', () => {
    it('should create thread and return confirmation', async () => {
      const tool = createThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({
        channel_id: 'ch_123',
        title: 'New Thread',
        content: 'Initial message',
      });

      expect(mockClient.createThread).toHaveBeenCalledWith(
        'ch_123',
        'New Thread',
        'Initial message'
      );
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Successfully created thread:'),
      });
      expect(result.content[0].text).toContain('Title: "New Thread"');
    });

    it('should validate all required parameters', async () => {
      const tool = createThreadTool(mockServer, () => mockClient);

      await expect(tool.handler({ channel_id: 'ch_123' })).rejects.toThrow();
      await expect(tool.handler({ title: 'Title' })).rejects.toThrow();
      await expect(tool.handler({ content: 'Content' })).rejects.toThrow();
    });
  });

  describe('add_message_to_thread', () => {
    it('should add message and return confirmation', async () => {
      const tool = addMessageToThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({
        thread_id: 'th_001',
        content: 'New message content',
      });

      expect(mockClient.addMessageToThread).toHaveBeenCalledWith('th_001', 'New message content');
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Successfully added message to thread:'),
      });
    });

    it('should handle API errors', async () => {
      mockClient.addMessageToThread = vi.fn().mockRejectedValue(new Error('Network error'));
      const tool = addMessageToThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({
        thread_id: 'th_001',
        content: 'Test',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error adding message: Network error');
    });
  });

  describe('close_thread', () => {
    it('should close thread with default message', async () => {
      const tool = closeThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({
        thread_id: 'th_001',
      });

      expect(mockClient.closeThread).toHaveBeenCalledWith('th_001', undefined);
      expect(result.content[0]).toMatchObject({
        type: 'text',
        text: expect.stringContaining('Successfully closed thread:'),
      });
      expect(result.content[0].text).toContain('Thread ID: th_001');
      expect(result.content[0].text).toContain('Closing message: "Thread closed"');
    });

    it('should close thread with custom message', async () => {
      const tool = closeThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({
        thread_id: 'th_001',
        message: 'Issue resolved - closing thread',
      });

      expect(mockClient.closeThread).toHaveBeenCalledWith(
        'th_001',
        'Issue resolved - closing thread'
      );
      expect(result.content[0].text).toContain(
        'Closing message: "Issue resolved - closing thread"'
      );
    });

    it('should validate required thread_id parameter', async () => {
      const tool = closeThreadTool(mockServer, () => mockClient);

      await expect(tool.handler({})).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      mockClient.closeThread = vi.fn().mockRejectedValue(new Error('Permission denied'));
      const tool = closeThreadTool(mockServer, () => mockClient);

      const result = await tool.handler({
        thread_id: 'th_001',
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Error closing thread: Permission denied');
    });
  });
});
