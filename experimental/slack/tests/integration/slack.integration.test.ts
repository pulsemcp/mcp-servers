import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../libs/test-mcp-client/build/index.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Slack MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  beforeEach(async () => {
    // Create mock data for tests
    const mockData = {
      channels: [
        {
          id: 'C111111111',
          name: 'general',
          is_channel: true,
          is_group: false,
          is_im: false,
          is_mpim: false,
          is_private: false,
          is_archived: false,
          is_general: true,
          is_member: true,
          num_members: 10,
          created: 1234567890,
          topic: { value: 'General discussion', creator: 'U123', last_set: 1234567890 },
          purpose: { value: 'A place for general chat', creator: 'U123', last_set: 1234567890 },
        },
        {
          id: 'C222222222',
          name: 'random',
          is_channel: true,
          is_group: false,
          is_im: false,
          is_mpim: false,
          is_private: false,
          is_archived: false,
          is_general: false,
          is_member: true,
          num_members: 5,
          created: 1234567891,
        },
      ],
      messages: {
        C111111111: [
          {
            type: 'message',
            user: 'U123456789',
            text: 'Hello world',
            ts: '1234567890.123456',
          },
        ],
      },
      threads: {
        'C111111111:1234567890.123456': [
          {
            type: 'message',
            user: 'U123456789',
            text: 'Parent message',
            ts: '1234567890.123456',
            thread_ts: '1234567890.123456',
          },
          {
            type: 'message',
            user: 'U987654321',
            text: 'Reply message',
            ts: '1234567890.123457',
            thread_ts: '1234567890.123456',
          },
        ],
      },
    };

    const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        SLACK_MOCK_DATA: JSON.stringify(mockData),
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

  it('should initialize successfully', async () => {
    if (!client) throw new Error('Client not initialized');

    const result = await client.listTools();
    expect(result).toBeDefined();
  });

  describe('Tool Registration', () => {
    it('should register all expected tools', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.listTools();
      const tools = result.tools;

      expect(tools).toHaveLength(7);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('slack_get_channels');
      expect(toolNames).toContain('slack_get_channel');
      expect(toolNames).toContain('slack_get_thread');
      expect(toolNames).toContain('slack_post_message');
      expect(toolNames).toContain('slack_reply_to_thread');
      expect(toolNames).toContain('slack_update_message');
      expect(toolNames).toContain('slack_react_to_message');
    });

    it('should have proper tool descriptions and schemas', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.listTools();
      const tools = result.tools;

      const getChannelsTool = tools.find((t) => t.name === 'slack_get_channels');
      expect(getChannelsTool?.description).toContain('List all Slack channels');
      expect(getChannelsTool?.inputSchema?.required).toEqual([]);

      const postMessageTool = tools.find((t) => t.name === 'slack_post_message');
      expect(postMessageTool?.inputSchema?.required).toEqual(['channel_id', 'text']);
    });
  });

  describe('slack_get_channels Tool', () => {
    it('should list all channels', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_get_channels', {});

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 channel(s)');
      expect(result.content[0].text).toContain('#general');
      expect(result.content[0].text).toContain('#random');
    });
  });

  describe('slack_get_channel Tool', () => {
    it('should get specific channel details', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_get_channel', {
        channel_id: 'C111111111',
        include_messages: false,
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('# Channel: #general');
      expect(result.content[0].text).toContain('Topic: General discussion');
    });

    it('should include messages when requested', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_get_channel', {
        channel_id: 'C111111111',
        include_messages: true,
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('## Recent Messages');
      expect(result.content[0].text).toContain('Hello world');
    });
  });

  describe('slack_get_thread Tool', () => {
    it('should get thread with replies', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_get_thread', {
        channel_id: 'C111111111',
        thread_ts: '1234567890.123456',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('## Parent Message');
      expect(result.content[0].text).toContain('Parent message');
      expect(result.content[0].text).toContain('## Replies');
      expect(result.content[0].text).toContain('Reply message');
    });
  });

  describe('slack_post_message Tool', () => {
    it('should post a new message', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_post_message', {
        channel_id: 'C111111111',
        text: 'Test message from integration test!',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Message posted successfully');
      expect(result.content[0].text).toContain('Test message from integration test!');
    });
  });

  describe('slack_reply_to_thread Tool', () => {
    it('should reply to a thread', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_reply_to_thread', {
        channel_id: 'C111111111',
        thread_ts: '1234567890.123456',
        text: 'This is a reply',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Reply posted successfully');
      expect(result.content[0].text).toContain('Thread: 1234567890.123456');
    });
  });

  describe('slack_update_message Tool', () => {
    it('should update a message', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_update_message', {
        channel_id: 'C111111111',
        message_ts: '1234567890.123456',
        text: 'Updated message content',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Message updated successfully');
      expect(result.content[0].text).toContain('Updated message content');
    });
  });

  describe('slack_react_to_message Tool', () => {
    it('should add a reaction', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('slack_react_to_message', {
        channel_id: 'C111111111',
        message_ts: '1234567890.123456',
        emoji: 'thumbsup',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Reaction added successfully');
      expect(result.content[0].text).toContain(':thumbsup:');
    });
  });
});
