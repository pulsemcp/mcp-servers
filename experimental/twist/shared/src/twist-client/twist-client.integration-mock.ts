import type { ITwistClient, Channel, Thread, ThreadWithMessages, Message } from '../server.js';

interface MockData {
  channels?: Channel[];
  threads?: Record<string, Thread[]>; // keyed by channel_id
  threadDetails?: Record<string, ThreadWithMessages>; // keyed by thread_id
  messages?: Record<string, Message[]>; // keyed by thread_id
  [key: string]: unknown;
}

/**
 * Creates a mock implementation of ITwistClient for integration tests.
 * This mocks the EXTERNAL API client (Twist API), NOT the MCP client.
 * The MCP client (TestMCPClient) is real and tests the actual MCP protocol.
 * This mock is only for external dependencies, keeping MCP testing authentic.
 */
export function createIntegrationMockTwistClient(
  mockData: MockData = {}
): ITwistClient & { mockData: MockData } {
  const client = {
    mockData, // Store the mock data so it can be extracted later

    // Mock methods based on ITwistClient interface
    async getChannels(): Promise<Array<Channel>> {
      if (mockData.channels) {
        return mockData.channels;
      }

      // Default mock response
      return [
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
          description: 'Engineering team channel',
          workspace_id: '228287',
          archived: false,
          created_ts: Date.now() / 1000,
        },
      ];
    },

    async getChannel(channelId: string): Promise<Channel> {
      const channels = await this.getChannels();
      const channel = channels.find((ch) => ch.id === channelId);

      if (channel) {
        return channel;
      }

      // Default mock response
      return {
        id: channelId,
        name: 'mock-channel',
        description: 'Mock channel',
        workspace_id: '228287',
        archived: false,
        created_ts: Date.now() / 1000,
      };
    },

    async getThreads(
      channelId: string,
      options?: { limit?: number; newerThanTs?: number }
    ): Promise<Array<Thread>> {
      if (mockData.threads?.[channelId]) {
        let threads = mockData.threads[channelId];

        if (options?.newerThanTs) {
          threads = threads.filter((t) => (t.posted_ts || 0) > options.newerThanTs!);
        }

        // For integration tests, return all threads and let the tool handle pagination
        // The real Twist API might return more threads than the limit,
        // allowing the client to know the total count
        return threads;
      }

      // Default mock response
      return [
        {
          id: 'th_001',
          title: 'Welcome to the channel',
          channel_id: channelId,
          workspace_id: '228287',
          creator: 'user_123',
          posted_ts: Date.now() / 1000,
          last_updated_ts: Date.now() / 1000,
          archived: false,
        },
      ];
    },

    async getThread(threadId: string): Promise<ThreadWithMessages> {
      if (mockData.threadDetails?.[threadId]) {
        return mockData.threadDetails[threadId];
      }

      // Default mock response
      const thread: ThreadWithMessages = {
        id: threadId,
        title: 'Mock Thread',
        channel_id: 'ch_123',
        workspace_id: '228287',
        creator: 'user_123',
        posted_ts: Date.now() / 1000,
        last_updated_ts: Date.now() / 1000,
        archived: false,
        messages: mockData.messages?.[threadId] || [
          {
            id: 'msg_001',
            thread_id: threadId,
            content: 'First message in the thread',
            creator: 'user_123',
            posted_ts: Date.now() / 1000,
          },
        ],
      };

      return thread;
    },

    async createThread(channelId: string, title: string, _content: string): Promise<Thread> {
      const thread: Thread = {
        id: `th_${Date.now()}`,
        title,
        channel_id: channelId,
        workspace_id: '228287',
        creator: 'test_user',
        posted_ts: Date.now() / 1000,
        last_updated_ts: Date.now() / 1000,
        archived: false,
      };

      // Store in mock data if threads exist
      if (mockData.threads) {
        if (!mockData.threads[channelId]) {
          mockData.threads[channelId] = [];
        }
        mockData.threads[channelId].push(thread);
      }

      return thread;
    },

    async addMessageToThread(threadId: string, content: string): Promise<Message> {
      const message: Message = {
        id: `msg_${Date.now()}`,
        thread_id: threadId,
        content,
        creator: 'test_user',
        posted_ts: Date.now() / 1000,
      };

      // Store in mock data if messages exist
      if (mockData.messages) {
        if (!mockData.messages[threadId]) {
          mockData.messages[threadId] = [];
        }
        mockData.messages[threadId].push(message);
      }

      return message;
    },

    async closeThread(threadId: string, message?: string): Promise<Message> {
      const closeMessage: Message = {
        id: `msg_close_${Date.now()}`,
        thread_id: threadId,
        content: message || 'Thread closed',
        creator: 'test_user',
        posted_ts: Date.now() / 1000,
      };

      // Store in mock data if messages exist
      if (mockData.messages) {
        if (!mockData.messages[threadId]) {
          mockData.messages[threadId] = [];
        }
        mockData.messages[threadId].push(closeMessage);
      }

      // Mark thread as closed in mock data if thread details exist
      if (mockData.threadDetails?.[threadId]) {
        // In a real API, this would set a closed status
        // For the mock, we'll just add the closing message
      }

      return closeMessage;
    },
  };

  return client;
}
