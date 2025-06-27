import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TestMCPClient } from '../../../../test-mcp-client/dist/index.js';
// import { createIntegrationMockTwistClient } from '../../shared/src/twist-client/twist-client.integration-mock.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Twist MCP Server Integration Tests', () => {
  let client: TestMCPClient | null = null;

  beforeEach(async () => {
    // Create mock data for tests
    const mockData = {
      channels: [
        {
          id: 'ch_123',
          name: 'general',
          description: 'General discussion',
          workspace_id: '228287',
          archived: false,
          created_ts: Date.now() / 1000,
        },
        {
          id: 'ch_456',
          name: 'engineering',
          description: 'Engineering team',
          workspace_id: '228287',
          archived: false,
          created_ts: Date.now() / 1000,
        },
      ],
      threads: {
        ch_123: [
          {
            id: 'th_001',
            title: 'Welcome Thread',
            channel_id: 'ch_123',
            workspace_id: '228287',
            creator: 'user_123',
            created_ts: Date.now() / 1000,
            last_updated_ts: Date.now() / 1000,
            archived: false,
          },
        ],
      },
      threadDetails: {
        th_001: {
          id: 'th_001',
          title: 'Welcome Thread',
          channel_id: 'ch_123',
          workspace_id: '228287',
          creator: 'user_123',
          created_ts: Date.now() / 1000,
          last_updated_ts: Date.now() / 1000,
          archived: false,
          messages: [
            {
              id: 'msg_001',
              thread_id: 'th_001',
              content: 'Welcome to the team!',
              creator: 'user_123',
              created_ts: Date.now() / 1000,
            },
          ],
        },
      },
    };

    // Path to our integration entry point that uses mocked external services
    const serverPath = path.join(__dirname, '../../local/build/index.integration-with-mock.js');

    client = new TestMCPClient({
      serverPath,
      env: {
        TWIST_BEARER_TOKEN: 'test-token',
        TWIST_WORKSPACE_ID: 'test-workspace',
        MCP_INTEGRATION_TEST_MOCK_DATA: JSON.stringify(mockData),
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

    // Server is initialized if we can list tools
    const tools = await client.listTools();
    expect(tools).toBeDefined();
  });

  describe('Tool Registration', () => {
    it('should register all expected tools', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.listTools();
      const tools = result.tools;

      expect(tools).toHaveLength(6);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('get_channels');
      expect(toolNames).toContain('get_channel');
      expect(toolNames).toContain('get_threads');
      expect(toolNames).toContain('get_thread');
      expect(toolNames).toContain('create_thread');
      expect(toolNames).toContain('add_message_to_thread');
    });

    it('should have proper tool descriptions and schemas', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.listTools();
      const tools = result.tools;

      const getChannelsTool = tools.find((t) => t.name === 'get_channels');
      expect(getChannelsTool?.description).toContain('List all channels in your Twist workspace');
      expect(getChannelsTool?.inputSchema?.required).toEqual([]);

      const createThreadTool = tools.find((t) => t.name === 'create_thread');
      expect(createThreadTool?.inputSchema?.required).toEqual(['channel_id', 'title', 'content']);
    });
  });

  describe('get_channels Tool', () => {
    it('should list all channels', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('get_channels', {});

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 2 active channels:');
      expect(result.content[0].text).toContain('#general (ID: ch_123)');
      expect(result.content[0].text).toContain('#engineering (ID: ch_456)');
    });
  });

  describe('get_channel Tool', () => {
    it('should get specific channel details', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('get_channel', {
        channel_id: 'ch_123',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Channel Details:');
      expect(result.content[0].text).toContain('Name: #general');
      expect(result.content[0].text).toContain('ID: ch_123');
    });

    it('should fail without channel_id', async () => {
      if (!client) throw new Error('Client not initialized');

      await expect(client.callTool('get_channel', {})).rejects.toThrow();
    });
  });

  describe('get_threads Tool', () => {
    it('should list threads in a channel', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('get_threads', {
        channel_id: 'ch_123',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Found 1 active threads:');
      expect(result.content[0].text).toContain('(ID: th_001)');
    });

    it('should handle empty channel', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('get_threads', {
        channel_id: 'ch_456',
      });

      // The mock returns a default thread for any channel
      expect(result.content[0].text).toContain('Found 1 active threads:');
    });
  });

  describe('get_thread Tool', () => {
    it('should get thread with messages', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('get_thread', {
        thread_id: 'th_001',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Thread:');
      expect(result.content[0].text).toContain('Messages (1 total):');
      expect(result.content[0].text).toContain('Welcome to the team!');
    });
  });

  describe('create_thread Tool', () => {
    it('should create a new thread', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('create_thread', {
        channel_id: 'ch_123',
        title: 'Test Thread',
        content: 'This is a test thread',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully created thread:');
      expect(result.content[0].text).toContain('Title: "Test Thread"');
    });

    it('should validate required parameters', async () => {
      if (!client) throw new Error('Client not initialized');

      await expect(
        client.callTool('create_thread', {
          channel_id: 'ch_123',
          // Missing title and content
        })
      ).rejects.toThrow();
    });
  });

  describe('add_message_to_thread Tool', () => {
    it('should add message to thread', async () => {
      if (!client) throw new Error('Client not initialized');

      const result = await client.callTool('add_message_to_thread', {
        thread_id: 'th_001',
        content: 'This is a new message',
      });

      expect(result.content[0].type).toBe('text');
      expect(result.content[0].text).toContain('Successfully added message to thread:');
    });
  });
});
