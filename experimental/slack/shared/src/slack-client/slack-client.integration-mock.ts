import type { ISlackClient } from '../server.js';
import type { Channel, Message } from '../types.js';

interface MockData {
  channels?: Channel[];
  messages?: Record<string, Message[]>; // channelId -> messages
  threads?: Record<string, Message[]>; // threadTs -> messages
  [key: string]: unknown;
}

/**
 * Creates a mock implementation of ISlackClient for integration tests.
 * This mocks the EXTERNAL Slack API, NOT the MCP client.
 */
export function createIntegrationMockSlackClient(
  mockData: MockData = {}
): ISlackClient & { mockData: MockData } {
  // Track posted messages for testing
  const postedMessages: Message[] = [];

  const client = {
    mockData,

    async getChannels(): Promise<Channel[]> {
      return (
        mockData.channels ?? [
          {
            id: 'C123456789',
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
          },
        ]
      );
    },

    async getChannel(channelId: string): Promise<Channel> {
      const channel = mockData.channels?.find((c) => c.id === channelId);
      if (channel) {
        return channel;
      }

      return {
        id: channelId,
        name: 'mock-channel',
        is_channel: true,
        is_group: false,
        is_im: false,
        is_mpim: false,
        is_private: false,
        is_archived: false,
        is_general: false,
        is_member: true,
        created: 1234567890,
      };
    },

    async getMessages(
      channelId: string,
      options?: { limit?: number }
    ): Promise<{
      messages: Message[];
      hasMore: boolean;
      nextCursor?: string;
    }> {
      const messages = mockData.messages?.[channelId] ?? [
        {
          type: 'message',
          user: 'U123456789',
          text: 'Mock message',
          ts: '1234567890.123456',
        },
      ];

      const limit = options?.limit ?? 20;
      return {
        messages: messages.slice(0, limit),
        hasMore: messages.length > limit,
      };
    },

    async getThread(
      channelId: string,
      threadTs: string,
      options?: { limit?: number }
    ): Promise<{
      messages: Message[];
      hasMore: boolean;
      nextCursor?: string;
    }> {
      const key = `${channelId}:${threadTs}`;
      const messages = mockData.threads?.[key] ?? [
        {
          type: 'message',
          user: 'U123456789',
          text: 'Mock parent message',
          ts: threadTs,
          thread_ts: threadTs,
        },
      ];

      const limit = options?.limit ?? 50;
      return {
        messages: messages.slice(0, limit),
        hasMore: messages.length > limit,
      };
    },

    async postMessage(
      channelId: string,
      text: string,
      options?: { threadTs?: string; replyBroadcast?: boolean }
    ): Promise<Message> {
      const ts = `${Date.now() / 1000}.123456`;
      const message: Message = {
        type: 'message',
        text,
        ts,
        thread_ts: options?.threadTs,
      };
      postedMessages.push(message);
      return message;
    },

    async updateMessage(channelId: string, ts: string, text: string): Promise<Message> {
      return {
        type: 'message',
        text,
        ts,
        edited: {
          user: 'U123456789',
          ts: `${Date.now() / 1000}`,
        },
      };
    },

    async addReaction(): Promise<void> {
      // No-op for mock
    },
  };

  return client;
}
